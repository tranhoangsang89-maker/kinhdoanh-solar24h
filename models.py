from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
import datetime
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    password_hash = Column(String)
    role = Column(String, default="sales") # "admin" or "sales"
    base_salary = Column(Float, default=5000000)
    full_name = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)

    customers = relationship("Customer", back_populates="sales_rep")
    reports = relationship("Report", back_populates="sales_rep")

class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    phone = Column(String)
    address = Column(String)
    note = Column(Text, nullable=True)
    status = Column(String, default="new") # new, warm, hot, pending, done, lost
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    sales_id = Column(Integer, ForeignKey("users.id"))
    sales_rep = relationship("User", back_populates="customers")
    schedules = relationship("Schedule", back_populates="customer")
    
    @property
    def sales_name(self):
        return self.sales_rep.username if self.sales_rep else "N/A"

class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    report_type = Column(String) # "work", "contract"
    image_url = Column(String, nullable=True)
    content = Column(Text)
    kwp = Column(Float, nullable=True) # for contract
    status = Column(String, default="pending") # pending, approved, rejected
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    sales_id = Column(Integer, ForeignKey("users.id"))
    sales_rep = relationship("User", back_populates="reports")
    
    @property
    def sales_name(self):
        return self.sales_rep.username if self.sales_rep else "N/A"

class Schedule(Base):
    __tablename__ = "schedules"

    id = Column(Integer, primary_key=True, index=True)
    time = Column(DateTime)
    note = Column(Text)
    is_completed = Column(Integer, default=0) # 0: False, 1: True
    
    customer_id = Column(Integer, ForeignKey("customers.id"))
    customer = relationship("Customer", back_populates="schedules")
