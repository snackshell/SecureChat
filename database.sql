-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE NOT NULL,
    is_online BOOLEAN DEFAULT FALSE,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    socket_id VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create group_messages table
CREATE TABLE IF NOT EXISTS group_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sender VARCHAR(255) NOT NULL REFERENCES users(username) ON DELETE CASCADE,
    content TEXT,
    image_url TEXT,
    "timestamp" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_edited BOOLEAN DEFAULT FALSE NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create direct_messages table
CREATE TABLE IF NOT EXISTS direct_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    from_user VARCHAR(255) NOT NULL REFERENCES users(username) ON DELETE CASCADE,
    to_user VARCHAR(255) NOT NULL REFERENCES users(username) ON DELETE CASCADE,
    content TEXT,
    image_url TEXT,
    "timestamp" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_edited BOOLEAN DEFAULT FALSE NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_users_not_same CHECK (from_user <> to_user)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_group_messages_sender ON group_messages(sender);
CREATE INDEX IF NOT EXISTS idx_group_messages_timestamp ON group_messages("timestamp");
CREATE INDEX IF NOT EXISTS idx_direct_messages_fromUser ON direct_messages(from_user);
CREATE INDEX IF NOT EXISTS idx_direct_messages_toUser ON direct_messages(to_user);
CREATE INDEX IF NOT EXISTS idx_direct_messages_timestamp ON direct_messages("timestamp");
CREATE INDEX IF NOT EXISTS idx_direct_messages_fromUser_toUser ON direct_messages(from_user, to_user); 