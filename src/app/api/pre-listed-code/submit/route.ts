import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    
    // Extract form fields
    const appName = formData.get("appName") as string;
    const shortDescription = formData.get("shortDescription") as string;
    const detailedDescription = formData.get("detailedDescription") as string;
    const vettScore = formData.get("vettScore") as string;
    const vettGrade = formData.get("vettGrade") as string;
    const executiveVerdict = formData.get("executiveVerdict") as string;
    const scanReport = formData.get("scanReport") as string;
    const fileTree = formData.get("fileTree") as string;
    const languages = formData.get("languages") as string;
    const frameworks = formData.get("frameworks") as string;
    const hasTests = formData.get("hasTests") as string;
    const hasDocumentation = formData.get("hasDocumentation") as string;
    const appCategory = formData.get("appCategory") as string;
    const tags = formData.get("tags") as string;
    const price = formData.get("price") as string;
    const currency = formData.get("currency") as string;
    const licenseType = formData.get("licenseType") as string;
    const liveDemo = formData.get("liveDemo") as string;
    const githubRepo = formData.get("githubRepo") as string;
    const documentationUrl = formData.get("documentationUrl") as string;
    const videoDemo = formData.get("videoDemo") as string;
    const supportedPlatforms = formData.get("supportedPlatforms") as string;
    const dependencies = formData.get("dependencies") as string;
    const commercialUse = formData.get("commercialUse") as string;
    const resaleRights = formData.get("resaleRights") as string;
    const supportLevel = formData.get("supportLevel") as string;
    const updateFrequency = formData.get("updateFrequency") as string;
    const warranty = formData.get("warranty") as string;
    const installationSupport = formData.get("installationSupport") as string;
    
    // Get file uploads
    const screenshots = formData.getAll("screenshots") as File[];
    const appIcon = formData.get("appIcon") as File | null;
    const codeZip = formData.get("codeZip") as File | null;

    // Validate required fields
    if (!appName || !shortDescription || !appCategory || !vettScore || !vettGrade || !scanReport) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // In a real implementation, you would:
    // 1. Upload files to ImageKit or similar service
    // 2. Save to database (MongoDB, etc.)
    // 3. Return success response
    
    // For now, return a success response with the data
    const responseData = {
      appName,
      shortDescription,
      detailedDescription,
      vettScore: parseInt(vettScore),
      vettGrade,
      executiveVerdict,
      scanReport: JSON.parse(scanReport),
      fileTree: fileTree ? JSON.parse(fileTree) : null,
      languages: languages ? JSON.parse(languages) : [],
      frameworks: frameworks ? JSON.parse(frameworks) : [],
      hasTests: hasTests === "true",
      hasDocumentation: hasDocumentation === "true",
      appCategory,
      tags: tags ? tags.split(",").map(t => t.trim()) : [],
      price: price ? parseFloat(price) : 0,
      currency,
      licenseType,
      liveDemo,
      githubRepo,
      documentationUrl,
      videoDemo,
      supportedPlatforms: supportedPlatforms ? JSON.parse(supportedPlatforms) : [],
      dependencies: dependencies ? JSON.parse(dependencies) : [],
      commercialUse: commercialUse === "true",
      resaleRights: resaleRights === "true",
      supportLevel,
      updateFrequency,
      warranty,
      installationSupport,
      screenshots: screenshots.map(s => s.name),
      appIcon: appIcon?.name,
      codeZip: codeZip?.name,
    };

    console.log("[Pre-List Submit] Received submission for:", appName);

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error("[Pre-List Submit] Error:", error);
    return NextResponse.json(
      { error: "Failed to process submission" },
      { status: 500 }
    );
  }
}
