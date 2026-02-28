import { logAPICall } from "./logger";

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";

export interface YouTubeVideo {
    title: string;
    description: string;
    thumbnailUrl: string;
    channelTitle: string;
    videoId: string;
    publishedAt: string;
}

// [NEW] Parses ISO 8601 duration (e.g. "PT4M33S") into total seconds
function parseISO8601Duration(duration: string): number {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    const hours = parseInt(match[1] || "0", 10);
    const minutes = parseInt(match[2] || "0", 10);
    const seconds = parseInt(match[3] || "0", 10);
    return hours * 3600 + minutes * 60 + seconds;
}

// [NEW] Fetches duration for a batch of video IDs, returns a map of videoId -> seconds
async function getVideosDuration(
    videoIds: string[]
): Promise<Map<string, number>> {
    const durationMap = new Map<string, number>();
    if (!YOUTUBE_API_KEY || videoIds.length === 0) return durationMap;

    try {
        const url = new URL("https://www.googleapis.com/youtube/v3/videos");
        url.searchParams.append("part", "contentDetails");
        url.searchParams.append("id", videoIds.join(","));
        url.searchParams.append("key", YOUTUBE_API_KEY);

        const response = await fetch(url.toString());
        if (!response.ok) {
            console.error("YouTube API Error (getVideosDuration):", response.status);
            return durationMap;
        }

        const data = await response.json();
        if (!data.items) return durationMap;

        for (const item of data.items) {
            const seconds = parseISO8601Duration(
                item.contentDetails?.duration || ""
            );
            durationMap.set(item.id, seconds);
        }
    } catch (error) {
        console.error("Failed to fetch video durations:", error);
    }

    return durationMap;
}

export async function searchYouTubeVideos(
    query: string,
    maxResults: number = 3
): Promise<YouTubeVideo[]> {
    if (!YOUTUBE_API_KEY) {
        console.warn("YOUTUBE_API_KEY is not set. Returning empty list.");
        return [];
    }

    try {
        const url = new URL(YOUTUBE_SEARCH_URL);
        url.searchParams.append("part", "snippet");
        // [CHANGED] Fetch more results to account for videos filtered out by duration
        url.searchParams.append("maxResults", Math.min(maxResults * 3, 50).toString());
        url.searchParams.append("q", query);
        url.searchParams.append("type", "video");
        url.searchParams.append("key", YOUTUBE_API_KEY);
        url.searchParams.append("safeSearch", "moderate");
        url.searchParams.append("videoEmbeddable", "true");
        url.searchParams.append("type", "video");
        // [NEW] Pre-filter hint: "long" = over 20min, "medium" = 4–20min.
        // Using "medium" as a broad pre-filter; strict >5min enforced below
        url.searchParams.append("videoDuration", "medium");

        const response = await fetch(url.toString());
        if (!response.ok) {
            const errorText = await response.text();
            console.error("YouTube API Error:", response.status, errorText);
            throw new Error(`YouTube API request failed: ${response.statusText}`);
        }

        const data = await response.json();
        if (!data.items) return [];

        const videos: YouTubeVideo[] = data.items.map((item: any) => ({
            title: item.snippet.title,
            description: item.snippet.description,
            thumbnailUrl:
                item.snippet.thumbnails?.high?.url ||
                item.snippet.thumbnails?.default?.url,
            channelTitle: item.snippet.channelTitle,
            videoId: item.id.videoId,
            publishedAt: item.snippet.publishedAt,
        }));

        // [NEW] Fetch durations and filter to only videos longer than 5 minutes
        const videoIds = videos.map((v) => v.videoId);
        const durationMap = await getVideosDuration(videoIds);

        const filtered = videos.filter((v) => {
            const seconds = durationMap.get(v.videoId) ?? 0;
            return seconds > 300; // 300 seconds = 5 minutes
        });

        // [CHANGED] Trim to the originally requested maxResults after filtering
        return filtered.slice(0, maxResults);
    } catch (error) {
        console.error("Failed to search YouTube:", error);
        return [];
    }
}

export function extractPlaylistId(url: string): string | null {
    try {
        const urlObj = new URL(url);
        return urlObj.searchParams.get("list");
    } catch {
        return null;
    }
}

export async function getPlaylistVideos(
    playlistId: string,
    maxResults: number = 50
): Promise<YouTubeVideo[]> {
    if (!YOUTUBE_API_KEY) {
        console.warn("YOUTUBE_API_KEY is not set. Returning empty list.");
        return [];
    }

    try {
        const url = new URL(
            "https://www.googleapis.com/youtube/v3/playlistItems"
        );
        url.searchParams.append("part", "snippet");
        url.searchParams.append("maxResults", maxResults.toString());
        url.searchParams.append("playlistId", playlistId);
        url.searchParams.append("key", YOUTUBE_API_KEY);

        const response = await fetch(url.toString());
        if (!response.ok) {
            const errorText = await response.text();
            console.error(
                "YouTube API Error (getPlaylistVideos):",
                response.status,
                errorText
            );
            throw new Error(`YouTube API request failed: ${response.statusText}`);
        }

        const data = await response.json();
        if (!data.items) return [];

        const videos: YouTubeVideo[] = data.items
            .filter(
                (item: any) =>
                    item.snippet &&
                    item.snippet.resourceId &&
                    item.snippet.resourceId.videoId
            )
            .map((item: any) => ({
                title: item.snippet.title,
                description: item.snippet.description,
                thumbnailUrl:
                    item.snippet.thumbnails?.high?.url ||
                    item.snippet.thumbnails?.default?.url,
                channelTitle: item.snippet.channelTitle,
                videoId: item.snippet.resourceId.videoId,
                publishedAt: item.snippet.publishedAt,
            }));

        // [NEW] Fetch durations and filter to only videos longer than 5 minutes
        const videoIds = videos.map((v) => v.videoId);
        const durationMap = await getVideosDuration(videoIds);

        const filtered = videos.filter((v) => {
            const seconds = durationMap.get(v.videoId) ?? 0;
            return seconds > 300; // 300 seconds = 5 minutes
        });

        return filtered;
    } catch (error) {
        console.error("Failed to fetch YouTube playlist items:", error);
        return [];
    }
}