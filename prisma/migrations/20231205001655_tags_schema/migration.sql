-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_parent_fkey" FOREIGN KEY ("parent") REFERENCES "Tag"("name") ON DELETE SET NULL ON UPDATE CASCADE;
