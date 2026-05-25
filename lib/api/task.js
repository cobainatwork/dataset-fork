import { request } from '@/lib/util/request';

/**
 * 獲取專案任務
 */
export function getProjectTasks(projectId) {
  return request(`/api/projects/${projectId}/tasks`);
}
