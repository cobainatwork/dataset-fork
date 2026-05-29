function vectorToPgLiteral(vec) {
  return `[${Array.from(vec).join(',')}]`;
}

function createPgvectorStore(prisma) {
  async function ensureSchema(_sourceType, _dim) {
    // Tables/indexes are managed by Prisma migrations; no-op here.
  }

  async function upsert(sourceType, points) {
    if (!points.length) return;
    const stmts = points.map(p =>
      prisma.$executeRawUnsafe(
        `INSERT INTO "Embeddings"("id","sourceType","sourceId","vector","modelName","dimension","createAt")
         VALUES ($1,$2,$3,$4::vector,$5,$6,NOW())
         ON CONFLICT ("sourceType","sourceId") DO UPDATE SET "vector" = EXCLUDED."vector", "modelName" = EXCLUDED."modelName"`,
        `${sourceType}_${p.id}`,
        sourceType,
        p.id,
        vectorToPgLiteral(p.vector),
        p.payload?.modelName || '',
        p.vector.length,
      )
    );
    await prisma.$transaction(stmts);
  }

  async function search(sourceType, vector, opts = {}) {
    const top = opts.top || 5;
    const excludeIds = opts.excludeIds || [];
    const excludeChunkId = opts.excludeChunkId || null;
    const literal = vectorToPgLiteral(vector);

    if (sourceType === 'question' && excludeChunkId) {
      const params = [literal, sourceType];
      let exclIdsClause = '';
      if (excludeIds.length) {
        params.push(excludeIds);
        exclIdsClause = `AND e."sourceId" <> ALL($${params.length}::text[])`;
      }
      params.push(excludeChunkId);
      const chunkParamIdx = params.length;
      params.push(top);
      const topParamIdx = params.length;
      const rows = await prisma.$queryRawUnsafe(
        `SELECT e."sourceId" AS id, 1 - (e.vector <=> $1::vector) AS score
         FROM "Embeddings" e
         JOIN "Questions" q ON q.id = e."sourceId"
         WHERE e."sourceType" = $2
         ${exclIdsClause}
         AND q."chunkId" <> $${chunkParamIdx}
         ORDER BY e.vector <=> $1::vector
         LIMIT $${topParamIdx}`,
        ...params
      );
      return rows.map(r => ({ id: r.id, score: Number(r.score) }));
    }

    const rows = await prisma.$queryRawUnsafe(
      `SELECT "sourceId" AS id, 1 - (vector <=> $1::vector) AS score
       FROM "Embeddings"
       WHERE "sourceType" = $2
       ${excludeIds.length ? `AND "sourceId" <> ALL($3::text[])` : ''}
       ORDER BY vector <=> $1::vector
       LIMIT $${excludeIds.length ? 4 : 3}`,
      literal,
      sourceType,
      ...(excludeIds.length ? [excludeIds, top] : [top])
    );
    return rows.map(r => ({ id: r.id, score: Number(r.score) }));
  }

  async function deletePoints(sourceType, ids) {
    if (!ids.length) return;
    await prisma.embeddings.deleteMany({
      where: { sourceType, sourceId: { in: ids } },
    });
  }

  async function count(sourceType) {
    return prisma.embeddings.count({ where: { sourceType } });
  }

  async function healthCheck() {
    try {
      await prisma.$queryRawUnsafe(`SELECT 1 FROM pg_extension WHERE extname='vector'`);
      return true;
    } catch {
      return false;
    }
  }

  return { ensureSchema, upsert, search, deletePoints, count, healthCheck };
}

module.exports = { createPgvectorStore };
