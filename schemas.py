from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class UserBase(BaseModel):
    username: str
    role: str
    base_salary: float
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    token: str
    user: UserResponse

class CustomerBase(BaseModel):
    name: str
    phone: str
    address: Optional[str] = None
    note: Optional[str] = None
    status: str = "new"

class CustomerCreate(CustomerBase):
    pass

class CustomerStatusUpdate(BaseModel):
    status: str


class CustomerResponse(CustomerBase):
    id: int
    sales_id: int
    sales_name: str
    created_at: datetime
    class Config:
        from_attributes = True

class ReportBase(BaseModel):
    report_type: str
    content: str
    kwp: Optional[float] = None
    image_url: Optional[str] = None

class ReportCreate(ReportBase):
    pass

class ReportResponse(ReportBase):
    id: int
    image_url: Optional[str] = None
    status: str
    created_at: datetime
    sales_id: int
    sales_name: str
    class Config:
        from_attributes = True

class KPIStats(BaseModel):
    total_customers: int
    total_contracts: int
    total_kwp: float

class SalaryReport(BaseModel):
    month: str
    user_id: int
    username: str
    full_name: str
    base_salary: float
    commission: float
    total_salary: float
