import * as MediaLibrary from "expo-media-library";
import { ImageManipulator } from "expo-image-manipulator";
import * as FileSystem from "expo-file-system";
import { Stack } from "./stack";
export class MediaAssets {
    _hasNextPage = true;
    _after = undefined;
    _pageSize = 0;
    _stack;
    constructor() {
        console.log("MediaAssets constructor");
        this._pageSize = 10;
        this._hasNextPage = true;
        this._after = undefined;
        this._stack = new Stack();
        this.getFirstAssetPage = this.getFirstAssetPage.bind(this);
        this.getNextAssetPage = this.getNextAssetPage.bind(this);
        console.log("MediaAssets ended constructor");
    }
    setPageSize(pageSize) {
        this._pageSize = pageSize;
    }
    async getFirstAssetPage(pageSize) {
        this._pageSize = pageSize;
        this._hasNextPage = true;
        this._after = undefined;
        const result = await this.getNextAssetPage();
        console.log("Got first page of assets with size: " + result?.length);
        return result ? result : [];
    }
    async getNextAssetPage() {
        this._stack.push(this._after);
        console.log("Getting next assets with page size: " + this._pageSize);
        console.log("  HasNextPage: " + this._hasNextPage);
        console.log(`  stack size: ${this._stack.size()}`);
        for (let i = 0; i < this._stack.size(); i++) {
            console.log(`  stack[${i}]: ${this._stack.get(i)}`);
        }
        if (this._hasNextPage) {
            const result = await this.getAssetPage(this._pageSize, this._after);
            this._hasNextPage = result.hasNextPage;
            this._after = result.endCursor;
            return result.assets;
        }
        return [];
    }
    async getPreviousAssetPage() {
        if (this._stack.isEmpty()) {
            return undefined;
        }
        this._stack.pop();
        let prev = this._stack.peek();
        console.log("Getting previous assets with page size: " + this._pageSize);
        console.log(`  stack size: ${this._stack.size()}`);
        for (let i = 0; i < this._stack.size(); i++) {
            console.log(`  stack[${i}]: ${this._stack.get(i)}`);
        }
        console.log("  cursor length: " + prev?.length);
        if (this._stack.size() > 0) {
            this._after = prev?.length === undefined ? undefined : prev;
            console.log("  this._after: " + this._after);
            return (await this.getAssetPage(this._pageSize, this._after)).assets;
        }
        return undefined;
    }
    async getAssetPage(pageSize, pageCursor) {
        console.log("getAssetPage: page size: " + pageSize);
        console.log("getAssetPage: page cursor: " + pageCursor);
        try {
            const result = await MediaLibrary.getAssetsAsync({
                first: pageSize,
                after: pageCursor,
            });
            return result;
        }
        catch (error) {
            console.error(`Error fetching asset page: ${error}`);
            throw error;
        }
    }
    async getAllAssets() {
        let assets = [];
        let hasNextPage = true;
        let after = undefined;
        while (hasNextPage) {
            const result = await MediaLibrary.getAssetsAsync({
                first: 100, // Adjust the number as needed
                after: after,
            });
            assets = assets.concat(result.assets);
            hasNextPage = result.hasNextPage;
            after = result.endCursor;
        }
        return assets;
    }
    async createThumbnail(uri, jobName, width, height) {
        let thumbnailUrlInBase64 = undefined;
        try {
            let thumbnailUri = undefined;
            // Copy the original image
            thumbnailUri = `${FileSystem.documentDirectory}Thumbnail_${jobName}.jpg`;
            console.log(`Creating thumbnail for ${uri}...`);
            console.log(`   by copying file to for ${thumbnailUri}...`);
            await FileSystem.copyAsync({
                from: uri,
                to: thumbnailUri,
            });
            // Manipulate the copied image to create a thumbnail
            const manipContext = await ImageManipulator.manipulate(thumbnailUri);
            manipContext.resize({ width: width, height: height });
            thumbnailUrlInBase64 = await FileSystem.readAsStringAsync(thumbnailUri, {
                encoding: FileSystem.EncodingType.Base64,
            });
            if (thumbnailUrlInBase64) {
                await FileSystem.deleteAsync(thumbnailUri);
            }
        }
        catch (error) {
            console.error(`Error creating thumbnail: ${error}`);
            thumbnailUrlInBase64 = undefined;
        }
        return thumbnailUrlInBase64;
    }
}
