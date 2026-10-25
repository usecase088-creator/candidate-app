-- CreateTable
CREATE TABLE "SearchLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "searchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pullUsed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SearchLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SearchLog_userId_pullUsed_idx" ON "SearchLog"("userId", "pullUsed");

-- AddForeignKey
ALTER TABLE "SearchLog" ADD CONSTRAINT "SearchLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
