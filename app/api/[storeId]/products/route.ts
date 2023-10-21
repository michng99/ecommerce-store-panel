import {NextResponse} from "next/server";
import {auth} from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";

export async function POST (
    req: Request,
    { params }: { params: { storeId: string }}
) {
    try {
        const body = await req.json();
        const { userId} = auth();
        const {
            name,
            price,
            categoryId,
            sizeId,
            images,
            isFeatured,
            isArchived,
        } = body;

        if (!userId) {
            //Unauthenticated: User is not logged in
            return new NextResponse("Unauthenticated", {status: 401})
        }

        if (!name) {
            return new NextResponse("Name is required", {status: 400})
        }

        if (!images || !images.length){
            return new NextResponse("Images are required", {status: 400})
        }

        if (!price) {
            return new NextResponse("Price URL is required", {status: 400})
        }

        if (!categoryId) {
            return new NextResponse("Category URL is required", {status: 400})
        }

        if (!sizeId) {
            return new NextResponse("Size URL is required", {status: 400})
        }

        if (!params.storeId) {
            return new NextResponse("Store ID is required", {status: 400})
        }

        const storeByUserId = await prismadb.store.findFirst({
           where: {
               id: params.storeId,
               userId
           }
        });

        if (!storeByUserId) {
            //Unauthorized: User doesn't have permission
            return new NextResponse("Unauthorized", {status: 403})
        }

        const product = await prismadb.product.create({
            data: {
                name,
                price,
                isFeatured,
                isArchived,
                categoryId,
                sizeId,
                storeId: params.storeId,
                images: {
                    createMany: {
                        data: [
                            ...images.map((image: { url: string }) => image)
                        ]
                    }
                }
            }
        });

        return NextResponse.json(product);

    } catch (err) {
        console.log('[PRODUCTS_POST]',err);
        return new NextResponse("Internal error",{status: 500})
    }
}


export async function GET (
    req: Request,
    { params }: { params: { storeId: string }}
) {
    try {
        const {searchParams} = new URL(req.url);
        const categoryId = searchParams.get("categoryId") || undefined
        const sizeId = searchParams.get("sizeId") || undefined
        const isFeatured = searchParams.get("isFeatured");


        if (!params.storeId) {
            return new NextResponse("Store ID is required", {status: 400})
        }

        const products = await prismadb.product.findMany({
            where: {
                storeId: params.storeId,
                categoryId,
                sizeId,
                isFeatured: isFeatured ? true : undefined,
                isArchived: false
            },
            include: {
                images: true,
                category: true,
                size: true
            },
            orderBy: {
              createdAt: 'desc'
            }

        });

        return NextResponse.json(products);

    } catch (err) {
        console.log('[PRODUCTS_GET]',err);
        return new NextResponse("Internal error",{status: 500})
    }
}
