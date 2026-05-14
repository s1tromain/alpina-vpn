import type { PrismaClient } from "@prisma/client";
import { NotFoundError } from "../../lib/errors.js";
import { UsersRepository } from "./users.repository.js";
import type { UserWithSubscription } from "./users.mapper.js";

export class UsersService {
  private readonly repo: UsersRepository;

  constructor(prisma: PrismaClient) {
    this.repo = new UsersRepository(prisma);
  }

  async getProfile(userId: string): Promise<UserWithSubscription> {
    const user = await this.repo.findById(userId);
    if (!user) throw new NotFoundError("User", userId);
    return user;
  }

  async listForAdmin(params: { skip?: number; take?: number; search?: string }) {
    return this.repo.listForAdmin(params);
  }
}
