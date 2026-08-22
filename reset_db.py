from database import SessionLocal, engine
from models import Base, User

def reset_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    admin = User(username="admin", password_hash="admin24h", role="admin", base_salary=0)
    db.add(admin)
    
    sales = User(username="phatnt", password_hash="solar24h", role="sales", base_salary=5000000)
    db.add(sales)
    
    db.commit()
    db.close()
    print("Reset DB and seeded admin and phatnt users.")

if __name__ == "__main__":
    reset_db()
