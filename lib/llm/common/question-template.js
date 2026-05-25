export function getQuestionTemplate(questionTemplate, language) {
  let templatePrompt = '';
  let outputFormatPrompt = '';
  if (questionTemplate) {
    const { customFormat, description, labels, answerType } = questionTemplate;
    if (description) {
      templatePrompt = `\n\n${description}`;
    }
    if (answerType === 'label') {
      outputFormatPrompt =
        language === 'en'
          ? ` \n\n ## Output Format \n\n Final output must be a string array, and must be selected from the following array, if the answer is not in the target array, return: ["other"] No additional information can be added: \n\n${labels}`
          : `\n\n ## 輸出格式 \n\n 最終輸出必須是一個字串陣列，而且必須在以下陣列中選擇，如果答案不在目標陣列中，返回：["其他"] 不得額外新增任何其他資訊：\n\n${labels}`;
    } else if (answerType === 'custom_format') {
      outputFormatPrompt =
        language === 'en'
          ? ` \n\n ## Output Format \n\n Final output must strictly follow the following structure, no additional information can be added: \n\n${customFormat}`
          : `\n\n ## 輸出格式 \n\n 最終輸出必須嚴格遵循以下結構，不得額外新增任何其他資訊：\n\n${customFormat}`;
    }
  }
  return {
    templatePrompt,
    outputFormatPrompt
  };
}
