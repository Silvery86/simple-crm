import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';

/**
 * Purpose: Debug endpoint to check isShared products in database.
 */
export async function GET() {
  try {
    // Get all products (cast to any to avoid TypeScript errors until Prisma regenerates)
    const allProducts = await prisma.product.findMany({
      select: {
        id: true,
        title: true,
        isShared: true,
      } as any,
      take: 10,
      orderBy: { createdAt: 'desc' },
    });

    // Count shared products
    const sharedCount = await prisma.product.count({
      where: { isShared: true } as any,
    });

    // Count all products
    const totalCount = await prisma.product.count();

    return NextResponse.json({
      success: true,
      data: {
        totalProducts: totalCount,
        sharedProducts: sharedCount,
        sampleProducts: allProducts,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
