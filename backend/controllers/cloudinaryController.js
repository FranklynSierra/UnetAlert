import cloudinary from "../config/cloudinary.js";

export const deleteImage = async (req, res) => {

    const { publicId } = req.body;

    const result = await cloudinary.uploader.destroy(publicId);

    res.json(result);

};