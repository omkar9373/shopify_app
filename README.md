# Shopify Announcement App

## Overview

This Shopify embedded app allows merchants to create and manage announcement banners that are displayed on their Shopify store. Announcement data is stored in MongoDB Atlas and can be updated directly from the app dashboard.

## Features

- Create announcement messages
- Save announcements to MongoDB Atlas
- Display announcement banner on Shopify storefront
- Embedded Shopify Admin App
- Real-time updates

## Tech Stack

- React Router
- Node.js
- Shopify App Bridge
- MongoDB Atlas
- Mongoose
- Polaris
- Shopify CLI

## Prerequisites

- Node.js 18+
- npm
- Shopify Partner Account
- Development Store
- MongoDB Atlas

## Installation

Clone the repository

```bash
git clone https://github.com/yourusername/shopify-announcement-app.git
cd shopify-announcement-app
```

Install dependencies

```bash
npm install
```

Create a `.env` file

```env
SHOPIFY_API_KEY=
SHOPIFY_API_SECRET=
SCOPES=
SHOP=
HOST=
MONGODB_URI=
```

Run the application

```bash
npm run dev
```

## Database

MongoDB Atlas

Database:

```
announcement
```

Collection:

```
announcement
```

## Deployment

Application URL

```
https://your-render-url.onrender.com
```

## Demo

Loom/YouTube Video

```
https://your-video-link
```

## Screenshots

- Shopify Admin Dashboard
- Online Store Banner
- MongoDB Document

## Author

Omkar Jadhav