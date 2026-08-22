from database import SessionLocal
from models import User

def seed_users():
    db = SessionLocal()
    
    # Check if admin exists
    admin = db.query(User).filter(User.username == "admin").first()
    if not admin:
        admin = User(username="admin", password_hash="123456", role="admin", base_salary=0)
        db.add(admin)
        

    # Check if khanghv exists
    khanghv = db.query(User).filter(User.username == "khanghv").first()
    if not khanghv:
        khanghv = User(username="khanghv", password_hash="admin24h", role="admin", base_salary=0, full_name="Hồ Vĩ Khang", avatar_url="Hồ Vĩ Khang.png")
        db.add(khanghv)

    # Check if huynh exists
    huynh = db.query(User).filter(User.username == "huynh").first()
    if not huynh:
        huynh = User(username="huynh", password_hash="solar24h", role="sales", base_salary=5000000, full_name="Nguyễn Hoàng Huy", avatar_url="Nguyễn Hoàng Huy.jpeg")
        db.add(huynh)
        
    db.commit()
    db.close()
    print("Seeded admin users.")

if __name__ == "__main__":
    seed_users()
