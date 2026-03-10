-- 使用 BIGINT 自增主键，便于扩展；时间用 DATETIME(3) 保留毫秒
-- 【库表设计示例】本项目所有 SQL 基于 InnoDB 引擎，支持事务与行级锁

-- 用户表：演示「主键」「唯一索引」和被其它表引用的「外键」
CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  username VARCHAR(100) NOT NULL COMMENT '登录名/昵称',
  email VARCHAR(255) NULL COMMENT '邮箱（可为空）',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  PRIMARY KEY (id),                             -- 聚簇主键，行的唯一标识
  UNIQUE KEY uk_users_username (username),      -- 唯一索引，防止重名
  UNIQUE KEY uk_users_email (email)             -- 唯一索引，允许多个 NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- Todo 表：演示「主键」「普通索引」「外键」「时间字段」
CREATE TABLE IF NOT EXISTS todos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  user_id BIGINT UNSIGNED NOT NULL COMMENT '所属用户ID（外键到 users.id）',
  title VARCHAR(500) NOT NULL COMMENT '标题',
  completed TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否完成，0/1',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  PRIMARY KEY (id),
  KEY idx_todos_user_created (user_id, created_at),  -- 复合索引：常见查询条件 user_id + 按时间排序
  KEY idx_todos_completed (completed),               -- 普通索引：按完成状态过滤
  CONSTRAINT fk_todos_user
    FOREIGN KEY (user_id) REFERENCES users(id)       -- 外键：保证 user_id 必须存在于 users 表
    ON DELETE CASCADE                                -- 删除用户时级联删除其 todos
    ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Todo 任务表';
