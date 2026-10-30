-- DropIndex
DROP INDEX `Ticket_code_key` ON `Ticket`;

-- AlterTable
ALTER TABLE `Ticket` DROP PRIMARY KEY,
    DROP COLUMN `id`,
    ADD PRIMARY KEY (`code`);

