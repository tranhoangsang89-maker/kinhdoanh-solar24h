import sqlite3

def upgrade_db():
    conn = sqlite3.connect('solar24h.db')
    cursor = conn.cursor()
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN full_name TEXT")
    except sqlite3.OperationalError:
        pass # Column might already exist
        
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN avatar_url TEXT")
    except sqlite3.OperationalError:
        pass
        
    # Set default values for existing users
    cursor.execute("UPDATE users SET full_name = 'Nguyễn Tấn Phát', avatar_url = '/Nguyễn Tấn Phát.png' WHERE username = 'phatnt'")
    cursor.execute("UPDATE users SET full_name = 'Giám Đốc', avatar_url = '/Logo Solar 24h.png' WHERE username = 'admin'")
    
    conn.commit()
    conn.close()
    print("Database upgraded successfully!")

if __name__ == "__main__":
    upgrade_db()
