from fastapi import FastAPI, Depends, HTTPException, status, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import uuid
import os
import io
from PIL import Image

import models, schemas
from database import SessionLocal, engine

from fastapi.staticfiles import StaticFiles

# Create DB tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Solar 24H API")

app.mount("/static", StaticFiles(directory="."), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    imgbb_api_key = os.getenv("IMGBB_API_KEY")
    content = await file.read()
    
    if imgbb_api_key:
        import requests
        import base64
        url = "https://api.imgbb.com/1/upload"
        payload = {
            "key": imgbb_api_key,
            "image": base64.b64encode(content).decode("utf-8")
        }
        try:
            res = requests.post(url, data=payload)
            if res.status_code == 200:
                data = res.json()
                return {"url": data["data"]["url"]}
        except Exception as e:
            pass # Fallback to local storage if imgbb fails

    os.makedirs("uploads", exist_ok=True)
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"{uuid.uuid4().hex}.jpg"  # Always save as jpg if compressed
    file_path = os.path.join("uploads", filename)
    
    try:
        img = Image.open(io.BytesIO(content))
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
        # Giảm kích thước ảnh nếu quá lớn, giữ nguyên tỷ lệ
        img.thumbnail((1200, 1200))
        # Lưu và nén ảnh
        img.save(file_path, "JPEG", optimize=True, quality=75)
    except Exception:
        # Nếu không phải file ảnh hợp lệ hoặc có lỗi, lưu nguyên gốc
        file_path = os.path.join("uploads", f"{uuid.uuid4().hex}.{ext}")
        with open(file_path, "wb") as buffer:
            buffer.write(content)
            
    return {"url": file_path.replace("\\", "/")}

@app.post("/login", response_model=schemas.LoginResponse)
def login(req: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == req.username).first()
    if not user or user.password_hash != req.password:
        raise HTTPException(status_code=401, detail="Sai tên đăng nhập hoặc mật khẩu")
    # For simplicity, returning a dummy token
    return {"token": str(uuid.uuid4()), "user": user}

@app.get("/users/me", response_model=schemas.UserResponse)
def get_me(username: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.get("/customers", response_model=List[schemas.CustomerResponse])
def get_customers(sales_id: int = None, db: Session = Depends(get_db)):
    query = db.query(models.Customer)
    if sales_id:
        query = query.filter(models.Customer.sales_id == sales_id)
    return query.all()

@app.post("/customers", response_model=schemas.CustomerResponse)
def create_customer(customer: schemas.CustomerCreate, sales_id: int, db: Session = Depends(get_db)):
    db_customer = models.Customer(**customer.model_dump(), sales_id=sales_id)
    db.add(db_customer)
    db.commit()
    db.refresh(db_customer)
    return db_customer

@app.patch("/customers/{customer_id}/status")
def update_customer_status(customer_id: int, req: schemas.CustomerStatusUpdate, db: Session = Depends(get_db)):
    customer = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    if customer:
        customer.status = req.status
        db.commit()
        return {"status": "success"}
    raise HTTPException(status_code=404, detail="Customer not found")

@app.post("/reports", response_model=schemas.ReportResponse)
def create_report(report: schemas.ReportCreate, sales_id: int, db: Session = Depends(get_db)):
    db_report = models.Report(**report.model_dump(), sales_id=sales_id)
    db.add(db_report)
    db.commit()
    db.refresh(db_report)
    return db_report

@app.get("/reports", response_model=List[schemas.ReportResponse])
def get_reports(report_type: str = None, status: str = None, sales_id: int = None, db: Session = Depends(get_db)):
    query = db.query(models.Report)
    if report_type:
        query = query.filter(models.Report.report_type == report_type)
    if status:
        query = query.filter(models.Report.status == status)
    if sales_id:
        query = query.filter(models.Report.sales_id == sales_id)
    return query.order_by(models.Report.created_at.desc()).all()

@app.post("/reports/{report_id}/approve")
def approve_report(report_id: int, db: Session = Depends(get_db)):
    report = db.query(models.Report).filter(models.Report.id == report_id).first()
    if report:
        report.status = "approved"
        db.commit()
        return {"status": "success"}
    raise HTTPException(status_code=404)

@app.post("/reports/{report_id}/reject")
def reject_report(report_id: int, db: Session = Depends(get_db)):
    report = db.query(models.Report).filter(models.Report.id == report_id).first()
    if report:
        report.status = "rejected"
        db.commit()
        return {"status": "success"}
    raise HTTPException(status_code=404)

@app.post("/reports/{report_id}/undo")
def undo_report(report_id: int, db: Session = Depends(get_db)):
    report = db.query(models.Report).filter(models.Report.id == report_id).first()
    if report:
        report.status = "pending"
        db.commit()
        return {"status": "success"}
    raise HTTPException(status_code=404)

@app.get("/admin/kpi-stats", response_model=schemas.KPIStats)
def get_kpi_stats(db: Session = Depends(get_db)):
    total_customers = db.query(models.Customer).count()
    total_contracts = db.query(models.Report).filter(models.Report.report_type == 'contract', models.Report.status == 'approved').count()
    total_kwp = sum([r.kwp for r in db.query(models.Report).filter(models.Report.report_type == 'contract', models.Report.status == 'approved').all() if r.kwp])
    return {"total_customers": total_customers, "total_contracts": total_contracts, "total_kwp": total_kwp}

@app.get("/admin/salary-stats")
def get_salary_stats(month: str, db: Session = Depends(get_db)):
    sales_users = db.query(models.User).filter(models.User.role == 'sales').all()
    all_contracts = db.query(models.Report).filter(models.Report.report_type == 'contract', models.Report.status == 'approved').all()
    
    salary_data = []
    for user in sales_users:
        approved_contracts = [r for r in all_contracts if r.sales_id == user.id and r.created_at.strftime('%m/%Y') == month]
        total_kwp = sum([r.kwp for r in approved_contracts if r.kwp])
        commission = total_kwp * 200000
        total_salary = user.base_salary + commission
        salary_data.append({
            "user_id": user.id,
            "username": user.username,
            "full_name": user.full_name or user.username,
            "base_salary": user.base_salary,
            "commission": commission,
            "total_salary": total_salary
        })
    return salary_data
