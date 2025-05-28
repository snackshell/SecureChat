-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    isOnline BOOLEAN DEFAULT FALSE,
    lastSeen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    socketId VARCHAR(255) NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create group_messages table
CREATE TABLE IF NOT EXISTS group_messages (
    id SERIAL PRIMARY KEY,
    sender VARCHAR(255) NOT NULL REFERENCES users(username) ON DELETE CASCADE,
    content TEXT,
    imageUrl TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    isEdited BOOLEAN DEFAULT FALSE,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create direct_messages table
CREATE TABLE IF NOT EXISTS direct_messages (
    id SERIAL PRIMARY KEY,
    fromUser VARCHAR(255) NOT NULL REFERENCES users(username) ON DELETE CASCADE,
    toUser VARCHAR(255) NOT NULL REFERENCES users(username) ON DELETE CASCADE,
    content TEXT,
    imageUrl TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    isEdited BOOLEAN DEFAULT FALSE,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_users_not_same CHECK (fromUser <> toUser)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_group_messages_sender ON group_messages(sender);
CREATE INDEX IF NOT EXISTS idx_group_messages_timestamp ON group_messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_direct_messages_fromUser ON direct_messages(fromUser);
CREATE INDEX IF NOT EXISTS idx_direct_messages_toUser ON direct_messages(toUser);
CREATE INDEX IF NOT EXISTS idx_direct_messages_timestamp ON direct_messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_direct_messages_fromUser_toUser ON direct_messages(fromUser, toUser); 