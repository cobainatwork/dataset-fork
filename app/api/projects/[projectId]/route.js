// 獲取專案詳情
import { deleteProject, getProject, updateProject, getTaskConfig } from '@/lib/db/projects';

export async function GET(request, { params }) {
  try {
    const { projectId } = params;
    const project = await getProject(projectId);
    const taskConfig = await getTaskConfig(projectId);
    if (!project) {
      return Response.json({ error: '專案不存在' }, { status: 404 });
    }
    return Response.json({ ...project, taskConfig });
  } catch (error) {
    console.error('獲取專案詳情出錯:', String(error));
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

// 更新專案
export async function PUT(request, { params }) {
  try {
    const { projectId } = params;
    const projectData = await request.json();

    const hasNameField = Object.prototype.hasOwnProperty.call(projectData, 'name');
    const hasDefaultModelField = Object.prototype.hasOwnProperty.call(projectData, 'defaultModelConfigId');

    // 至少允許更新名稱或預設模型（defaultModelConfigId 可顯式為 null）
    if (!hasNameField && !hasDefaultModelField) {
      return Response.json({ error: '專案名稱不能為空' }, { status: 400 });
    }

    if (hasNameField && !projectData.name && !hasDefaultModelField) {
      return Response.json({ error: '專案名稱不能為空' }, { status: 400 });
    }

    const updatedProject = await updateProject(projectId, projectData);

    if (!updatedProject) {
      return Response.json({ error: '專案不存在' }, { status: 404 });
    }

    return Response.json(updatedProject);
  } catch (error) {
    console.error('更新專案出錯:', String(error));
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

// 刪除專案
export async function DELETE(request, { params }) {
  try {
    const { projectId } = params;
    const success = await deleteProject(projectId);

    if (!success) {
      return Response.json({ error: '專案不存在' }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('刪除專案出錯:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
