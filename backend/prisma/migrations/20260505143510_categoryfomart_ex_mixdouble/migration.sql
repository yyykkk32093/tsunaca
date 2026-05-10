-- DropForeignKey
ALTER TABLE "Inquiry" DROP CONSTRAINT "Inquiry_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "Inquiry" DROP CONSTRAINT "Inquiry_userId_fkey";

-- DropForeignKey
ALTER TABLE "InquiryAttachment" DROP CONSTRAINT "InquiryAttachment_messageId_fkey";

-- DropForeignKey
ALTER TABLE "InquiryMessage" DROP CONSTRAINT "InquiryMessage_inquiryId_fkey";

-- DropIndex
DROP INDEX "Place_normalizedAddress_trgm_idx";

-- DropIndex
DROP INDEX "Place_normalizedName_trgm_idx";

-- AddForeignKey
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "InquiryCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InquiryMessage" ADD CONSTRAINT "InquiryMessage_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InquiryAttachment" ADD CONSTRAINT "InquiryAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "InquiryMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
