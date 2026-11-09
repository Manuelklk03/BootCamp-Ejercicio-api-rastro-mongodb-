import { Router } from "express";
import { ObjectId } from "mongodb";
import type { Filter } from "mongodb";
import type { Listing } from "../types";
import { listingsCollection } from "../db";

const router = Router();

const LIST_FIELDS = { title: 1, price: 1, category: 1, city: 1, status: 1 };

router.get("/", async (req, res) => {
  const filter: Filter<Listing> = {};

  if (typeof req.query.category === "string") {
    filter.category = req.query.category;
  }

  if (typeof req.query.city === "string") {
    filter.city = req.query.city;
  }

  const { maxPrice } = req.query;
  if (maxPrice !== undefined) {
    if (typeof maxPrice !== "string" || maxPrice.trim() === "" || !Number.isFinite(Number(maxPrice))) {
      res.status(400).json({ error: "maxPrice tiene que ser un número válido" });
      return;
    }

    filter.price = { $lte: Number(maxPrice) };
  }
  const listings = await listingsCollection()
    .find(filter)
    .project(LIST_FIELDS)
    .sort({ publishedAt: -1 })
    .toArray();

  res.json(listings);
});

router.get("/:id", async (req, res) => {
  const { id } = req.params;
  if (!ObjectId.isValid(id)) {
    res.status(400).json({ error: "El id no tiene un formato válido" });
    return;
  }

  const listing = await listingsCollection().findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $inc: { views: 1 } },
    { returnDocument: "after" },
  );

  if (!listing) {
    res.status(404).json({ error: "No existe ningún anuncio con ese id" });
    return;
  }

  res.json(listing);
});

export default router;
