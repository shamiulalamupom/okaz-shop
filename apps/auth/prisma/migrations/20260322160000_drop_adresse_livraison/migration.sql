-- The single adresseLivraison field is superseded by the Address table.
ALTER TABLE "User" DROP COLUMN IF EXISTS "adresseLivraison";
