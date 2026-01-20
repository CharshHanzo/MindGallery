-- CreateTable
CREATE TABLE "Image" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "storageType" TEXT NOT NULL DEFAULT 'minio',
    "bucketName" TEXT,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "uploadTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT,
    "description" TEXT,
    "tags" TEXT[],
    "vector" DOUBLE PRECISION[],
    "width" INTEGER,
    "height" INTEGER,
    "cameraModel" TEXT,
    "location" TEXT,
    "takenTime" TIMESTAMP(3),

    CONSTRAINT "Image_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Album" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Album_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImageAlbum" (
    "id" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "albumId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImageAlbum_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Image_uploadTime_idx" ON "Image"("uploadTime");

-- CreateIndex
CREATE INDEX "Image_tags_idx" ON "Image"("tags");

-- CreateIndex
CREATE UNIQUE INDEX "Album_name_key" ON "Album"("name");

-- CreateIndex
CREATE INDEX "Album_createdAt_idx" ON "Album"("createdAt");

-- CreateIndex
CREATE INDEX "ImageAlbum_imageId_idx" ON "ImageAlbum"("imageId");

-- CreateIndex
CREATE INDEX "ImageAlbum_albumId_idx" ON "ImageAlbum"("albumId");

-- CreateIndex
CREATE INDEX "ImageAlbum_addedAt_idx" ON "ImageAlbum"("addedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ImageAlbum_imageId_albumId_key" ON "ImageAlbum"("imageId", "albumId");

-- AddForeignKey
ALTER TABLE "ImageAlbum" ADD CONSTRAINT "ImageAlbum_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Image"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImageAlbum" ADD CONSTRAINT "ImageAlbum_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album"("id") ON DELETE CASCADE ON UPDATE CASCADE;
