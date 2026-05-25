import { useState, useEffect } from 'react';

// 儲存檔案處理狀態的共享物件
const fileProcessingSubscribers = {
  value: false,
  listeners: new Set()
};

// 儲存檔案任務資訊的共享物件
const fileTaskSubscribers = {
  value: null,
  listeners: new Set()
};

/**
 * 自定義hook，用於在元件間共享檔案處理任務的狀態
 */
export default function useFileProcessingStatus() {
  const [taskFileProcessing, setTaskFileProcessing] = useState(fileProcessingSubscribers.value);
  const [task, setTask] = useState(fileTaskSubscribers.value);

  useEffect(() => {
    // 添加當前元件為訂閱者
    const updateProcessingState = newValue => setTaskFileProcessing(newValue);
    const updateTaskState = newTask => setTask(newTask);

    fileProcessingSubscribers.listeners.add(updateProcessingState);
    fileTaskSubscribers.listeners.add(updateTaskState);

    // 元件解除安裝時清理
    return () => {
      fileProcessingSubscribers.listeners.delete(updateProcessingState);
      fileTaskSubscribers.listeners.delete(updateTaskState);
    };
  }, []);

  // 共享的setState函式
  const setSharedFileProcessing = newValue => {
    fileProcessingSubscribers.value = newValue;
    // 通知所有訂閱者
    fileProcessingSubscribers.listeners.forEach(listener => listener(newValue));
  };

  // 共享的setTask函式
  const setSharedTask = newTask => {
    fileTaskSubscribers.value = newTask;
    // 通知所有訂閱者
    fileTaskSubscribers.listeners.forEach(listener => listener(newTask));
  };

  return {
    taskFileProcessing,
    task,
    setTaskFileProcessing: setSharedFileProcessing,
    setTask: setSharedTask
  };
}
