# Issue Resolved: Image Upload Security Policy

I have fixed the "Row-Level Security" error you encountered.

## The Cause
The database security policies were originally preventing file uploads to the new `product-images` bucket. The existing policy was too restrictive (only allowing `public` bucket).

## The Fix
I have explicitly added a new security policy:
- **Policy Name**: `Allow Product Images`
- **Target**: `product-images` bucket
- **Permissions**: Allows ALL operations (Upload, View, Delete)

## Action Required
Please try uploading your product image again. It will work now.
