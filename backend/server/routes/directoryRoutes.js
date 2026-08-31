import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  listSavedPersons,
  getSavedPerson,
  deleteSavedPerson,
  listSavedLocations,
  getSavedLocation,
  deleteSavedLocation,
} from "../controllers/directoryController.js";

const router = express.Router();

// All directory routes require auth
router.use(authMiddleware);

// Saved persons
router.get("/persons", listSavedPersons);
router.get("/persons/:id", getSavedPerson);
router.delete("/persons/:id", deleteSavedPerson);

// Saved locations
router.get("/locations", listSavedLocations);
router.get("/locations/:id", getSavedLocation);
router.delete("/locations/:id", deleteSavedLocation);

export default router;
