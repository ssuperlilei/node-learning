export interface Todo {
  id: number;
  /** 归属用户 ID（演示外键列） */
  userId: number;
  title: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** 带用户名称的 Todo（演示 JOIN 查询返回的结构） */
export interface TodoWithUser extends Todo {
  username: string;
}

export interface CreateTodoDto {
  /** 标题（必填） */
  title: string;
  /**
   * 所属用户 ID，可选：
   * - 不传时，仓库层会默认写入「演示用户」ID
   * - 传入时，将作为 INSERT user_id 的值
   */
  userId?: number;
}

export interface UpdateTodoDto {
  title?: string;
  completed?: boolean;
}
