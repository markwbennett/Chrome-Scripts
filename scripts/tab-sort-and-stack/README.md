# Tab Sort and Stack by Domain

A Chrome extension that organizes all tabs into stacks grouped by domain name.

## Features

- Takes all tabs from all existing stacks and ungroups them
- Groups tabs by their domain name (e.g., all Google tabs together, all GitHub tabs together)
- Sorts the domain groups alphabetically by domain name
- Assigns different colors to each domain group
- Only creates groups for domains with multiple tabs
- Simple one-click operation

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select this folder
4. The extension icon will appear in your toolbar

## Usage

1. Click the extension icon in your Chrome toolbar
2. Click "Organize Tabs by Domain"
3. All tabs will be automatically organized into domain-based stacks

## How it Works

The extension:
1. Queries all open tabs
2. Ungroups any existing tab groups
3. Groups tabs by their hostname (domain)
4. Sorts domains alphabetically
5. Moves tabs to organize them by domain in sorted order
6. Creates colored tab groups for domains with multiple tabs
7. Single tabs remain ungrouped but are positioned with their domain

## Permissions

- `tabs`: To access and modify tab information
- `tabGroups`: To create and manage tab groups