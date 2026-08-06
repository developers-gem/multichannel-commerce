import Integration from "./integration.model";

import { ApiError } from "../../utils/ApiError";
import { HTTP_STATUS } from "../../shared/constants/http-status.constants";

import { CreateIntegrationDto } from "./integration.types";

class IntegrationService {
  /**
   * Create Integration
   */
  async create(data: CreateIntegrationDto) {
    const existing = await Integration.findOne({
      platform: data.platform,
      storeUrl: data.storeUrl,
    });

    if (existing) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Integration already exists"
      );
    }

    const integration = await Integration.create(data);

    return {
      id: integration._id,
      platform: integration.platform,
      storeName: integration.storeName,
      storeUrl: integration.storeUrl,
      isActive: integration.isActive,
      lastSync: integration.lastSync,
    };
  }

  /**
   * Get All Integrations
   */
  async getAll() {
    return Integration.find()
      .select("-credentials -__v")
      .sort({ createdAt: -1 });
  }

  /**
   * Get Integration By Id
   */
  async getById(id: string) {
    const integration = await Integration.findById(id).select(
      "-credentials -__v"
    );

    if (!integration) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Integration not found"
      );
    }

    return integration;
  }

  /**
   * Update Integration
   */
  async update(
    id: string,
    data: Partial<CreateIntegrationDto>
  ) {
    const integration = await Integration.findByIdAndUpdate(
      id,
      data,
      {
        new: true,
        runValidators: true,
      }
    ).select("-credentials -__v");

    if (!integration) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Integration not found"
      );
    }

    return integration;
  }

  /**
   * Delete Integration
   */
  async delete(id: string) {
    const integration = await Integration.findByIdAndDelete(id);

    if (!integration) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Integration not found"
      );
    }

    return;
  }
}

export const integrationService = new IntegrationService();