# Vercel Environment Variable Setup

## Required Environment Variables

The following environment variable MUST be added to Vercel for the buttons to work:

### NEXT_PUBLIC_LANDING_URL

- **Value**: `https://vettcodecli.vercel.app`
- **Description**: URL of the VettCode CLI Landing Page where reports are viewed
- **Required for**:
  - "Open CLI Report Viewer" button
  - "Copy Share Link" button

## How to Add on Vercel

1. Go to https://vercel.com/dashboard
2. Select the `vettcode-egine` project (Vettcode-scanner)
3. Go to Settings → Environment Variables
4. Add new variable:
   - **Name**: `NEXT_PUBLIC_LANDING_URL`
   - **Value**: `https://vettcodecli.vercel.app`
   - **Environment**: Production, Preview, Development (all)
5. Click "Save"
6. Redeploy the project for changes to take effect

## Note

This variable is already added to `.env.local` and `.env.example` for local development.
