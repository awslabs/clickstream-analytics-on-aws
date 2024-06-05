"use strict";
/**
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
 *  with the License. A copy of the License is located at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions
 *  and limitations under the License.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const serve_static_1 = __importDefault(require("serve-static"));
const path_1 = __importDefault(require("path"));
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
app.use((0, serve_static_1.default)(path_1.default.join(__dirname, 'public'), {
    maxAge: '1d',
    setHeaders: setCustomCacheControl
}));
app.listen(port, () => console.log(`Listening on port ${port}`));
function setCustomCacheControl(res, path) {
    if (serve_static_1.default.mime.lookup(path) === 'text/html') {
        // Custom Cache-Control for HTML files
        res.setHeader('Cache-Control', 'public, max-age=0');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7Ozs7Ozs7O0dBV0c7Ozs7O0FBRUgsc0RBQThCO0FBQzlCLGdFQUF1QztBQUN2QyxnREFBd0I7QUFFeEIsTUFBTSxHQUFHLEdBQW9CLElBQUEsaUJBQU8sR0FBRSxDQUFDO0FBRXZDLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQztBQUV0QyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUEsc0JBQVcsRUFBQyxjQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUMsRUFBRTtJQUNoRCxNQUFNLEVBQUUsSUFBSTtJQUNaLFVBQVUsRUFBRSxxQkFBcUI7Q0FDbEMsQ0FBQyxDQUFDLENBQUE7QUFFTCxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLHFCQUFxQixJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFFakUsU0FBUyxxQkFBcUIsQ0FBRSxHQUFRLEVBQUUsSUFBUztJQUMvQyxJQUFJLHNCQUFXLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxXQUFXLEVBQUU7UUFDakQsc0NBQXNDO1FBQ3RDLEdBQUcsQ0FBQyxTQUFTLENBQUMsZUFBZSxFQUFFLG1CQUFtQixDQUFDLENBQUE7S0FDcEQ7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiAgQ29weXJpZ2h0IEFtYXpvbi5jb20sIEluYy4gb3IgaXRzIGFmZmlsaWF0ZXMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIikuIFlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2VcbiAqICB3aXRoIHRoZSBMaWNlbnNlLiBBIGNvcHkgb2YgdGhlIExpY2Vuc2UgaXMgbG9jYXRlZCBhdFxuICpcbiAqICAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogIG9yIGluIHRoZSAnbGljZW5zZScgZmlsZSBhY2NvbXBhbnlpbmcgdGhpcyBmaWxlLiBUaGlzIGZpbGUgaXMgZGlzdHJpYnV0ZWQgb24gYW4gJ0FTIElTJyBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTXG4gKiAgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZXhwcmVzcyBvciBpbXBsaWVkLiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnNcbiAqICBhbmQgbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cblxuaW1wb3J0IGV4cHJlc3MgZnJvbSAnZXhwcmVzcyc7XG5pbXBvcnQgc2VydmVTdGF0aWMgZnJvbSAnc2VydmUtc3RhdGljJztcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xuXG5jb25zdCBhcHA6IGV4cHJlc3MuRXhwcmVzcyA9IGV4cHJlc3MoKTtcblxuY29uc3QgcG9ydCA9IHByb2Nlc3MuZW52LlBPUlQgfHwgMzAwMDtcblxuYXBwLnVzZShzZXJ2ZVN0YXRpYyhwYXRoLmpvaW4oX19kaXJuYW1lLCAncHVibGljJyksIHtcbiAgICBtYXhBZ2U6ICcxZCcsXG4gICAgc2V0SGVhZGVyczogc2V0Q3VzdG9tQ2FjaGVDb250cm9sXG4gIH0pKVxuICBcbmFwcC5saXN0ZW4ocG9ydCwgKCkgPT4gY29uc29sZS5sb2coYExpc3RlbmluZyBvbiBwb3J0ICR7cG9ydH1gKSk7XG4gIFxuZnVuY3Rpb24gc2V0Q3VzdG9tQ2FjaGVDb250cm9sIChyZXM6IGFueSwgcGF0aDogYW55KSB7XG4gICAgaWYgKHNlcnZlU3RhdGljLm1pbWUubG9va3VwKHBhdGgpID09PSAndGV4dC9odG1sJykge1xuICAgICAgLy8gQ3VzdG9tIENhY2hlLUNvbnRyb2wgZm9yIEhUTUwgZmlsZXNcbiAgICAgIHJlcy5zZXRIZWFkZXIoJ0NhY2hlLUNvbnRyb2wnLCAncHVibGljLCBtYXgtYWdlPTAnKVxuICAgIH1cbiAgfVxuIl19