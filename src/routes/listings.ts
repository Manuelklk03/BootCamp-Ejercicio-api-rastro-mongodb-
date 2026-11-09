import { Router } from "express";
import { ObjectId } from "mongodb";
import type { Filter } from "mongodb";
import type { Listing } from "../types";
import { listingsCollection, usersCollection } from "../db";

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

router.post("/", async (req, res) => {
  const body: Record<string, unknown> = req.body ?? {};
  const { title, description, category, city, price, sellerId } = body;

  if (
    typeof title !== "string" || title.trim() === "" ||
    typeof description !== "string" || description.trim() === "" ||
    typeof category !== "string" || category.trim() === "" ||
    typeof city !== "string" || city.trim() === ""
  ) {
    res.status(400).json({ error: "title, description, category y city deben ser textos no vacíos" });
    return;
  }

  if (typeof price !== "number" || !Number.isFinite(price) || price < 0) {
    res.status(400).json({ error: "price tiene que ser un número mayor o igual que 0" });
    return;
  }

  if (typeof sellerId !== "string" || !ObjectId.isValid(sellerId)) {
    res.status(400).json({ error: "sellerId no tiene un formato válido" });
    return;
  }

  const attributes = body.attributes === undefined ? {} : body.attributes;
  if (typeof attributes !== "object" || attributes === null || Array.isArray(attributes)) {
    res.status(400).json({ error: "attributes tiene que ser un objeto" });
    return;
  }

  const seller = await usersCollection().findOne({ _id: new ObjectId(sellerId) });
  if (!seller) {
    res.status(400).json({ error: "No existe ningún usuario con ese sellerId" });
    return;
  }

  const listing: Listing = {
    title,
    description,
    price,
    category,
    status: "AVAILABLE",
    city,
    publishedAt: new Date(),
    views: 0,
    seller: { id: seller._id, name: seller.name },
    photos: [],
    attributes: attributes as Record<string, unknown>,
  };

  const result = await listingsCollection().insertOne(listing);
  res.status(201).json({ ...listing, _id: result.insertedId });
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
