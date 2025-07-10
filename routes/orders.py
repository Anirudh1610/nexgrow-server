from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List
import logging

from ..database import get_db
from ..models import ProductPackingResponse

router = APIRouter()

@router.get("/orders/products/{product_name}/packing", response_model=List[ProductPackingResponse])
async def get_product_packing_by_name(
    product_name: str,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    logging.info(f"Fetching packing info for product_name: '{product_name}'")
    
    # Find all products with the same name
    products_cursor = db.products.find(
        {"name": product_name},
        {"_id": 1, "name": 1, "packing_size": 1, "bottles_per_case": 1, "bottle_volume": 1, "moq": 1}
    )
    products = await products_cursor.to_list(length=100)
    
    if not products:
        raise HTTPException(status_code=404, detail="No products found with that name")
    
    logging.info(f"Found {len(products)} products with name '{product_name}'")
    logging.info(f"Products packing info: {products}")
    return products