import Product from "./product.model";

import {
  CreateProductDto,
  UpdateProductDto,
} from "./product.types";

import { ApiError } from "../../utils/ApiError";
import { HTTP_STATUS } from "../../shared/constants/http-status.constants";

class ProductService {
  /**
   * Create Product
   */
  async create(data: CreateProductDto) {
    const existingProduct = await Product.findOne({
      sku: data.sku,
      isDeleted: false,
    });

    if (existingProduct) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "SKU already exists"
      );
    }

    const product = await Product.create(data);

    return product;
  }

  /**
   * Get All Products
   */
  /**
 * Get All Products
 */
async getAll(
  page: number = 1,
  limit: number = 10,
  search: string = ""
) {
  const skip = (page - 1) * limit;

  const query = {
    isDeleted: false,
    ...(search && {
      $or: [
        { sku: { $regex: search, $options: "i" } },
        { title: { $regex: search, $options: "i" } },
      ],
    }),
  };

  const [products, total] = await Promise.all([
    Product.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }),

    Product.countDocuments(query),
  ]);

  return {
    products,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
  /**
   * Get Product By Id
   */
  async getById(id: string) {
    const product = await Product.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!product) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Product not found"
      );
    }

    return product;
  }

  /**
   * Update Product
   */
  async update(
    id: string,
    data: UpdateProductDto
  ) {
    const product = await Product.findOneAndUpdate(
      {
        _id: id,
        isDeleted: false,
      },
      data,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!product) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Product not found"
      );
    }

    return product;
  }

  /**
   * Soft Delete Product
   */
  async delete(id: string) {
    const product = await Product.findOneAndUpdate(
      {
        _id: id,
        isDeleted: false,
      },
      {
        isDeleted: true,
      },
      {
        new: true,
      }
    );

    if (!product) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Product not found"
      );
    }

    return;
  }
}

export const productService = new ProductService();