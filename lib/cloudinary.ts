import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

export const uploadToCloudinary = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
        cloudinary.uploader.upload_stream(
            { resource_type: 'raw' },
            (error, result) => {
                if (error) reject(error);
                else resolve({ secure_url: result!.secure_url, public_id: result!.public_id });
            }
        ).end(buffer);
    });
};

export const deleteFromCloudinary = async (public_id: string) => {
    return new Promise((resolve, reject) => {
        cloudinary.uploader.destroy(public_id, { resource_type: 'raw' }, (error, result) => {
            if (error) reject(error);
            else resolve(result);
        });
    });
};

export default cloudinary;
