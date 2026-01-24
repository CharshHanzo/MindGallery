CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE "Image"
ADD COLUMN IF NOT EXISTS "embedding" vector(512);

CREATE INDEX IF NOT EXISTS "image_embedding_ivfflat_idx"
ON "Image" USING ivfflat ("embedding" vector_cosine_ops);
