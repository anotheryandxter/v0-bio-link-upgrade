// ===== COMPLETE USER AND DATA SETUP FOR REFLECTION PHOTOGRAPHY =====
// This script creates the auth user and sets up all default data

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables")
  process.exit(1)
}

// Create admin client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function setupUserAndData() {
  try {
    console.log("[v0] Starting user and data setup...")

    // Step 1: Create the auth user
    console.log("[v0] Creating auth user...")
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: "ryndxtr@gmail.com",
      password: "LLLebaran2025#",
      email_confirm: true,
      user_metadata: {
        username: "ryandxter",
        full_name: "Reflection Photography",
      },
    })

    if (authError) {
      // Check if user already exists
      if (authError.message.includes("already registered")) {
        console.log("[v0] User already exists, fetching existing user...")
        const { data: existingUsers, error: fetchError } = await supabase.auth.admin.listUsers()

        if (fetchError) {
          throw new Error(`Failed to fetch existing users: ${fetchError.message}`)
        }

        const existingUser = existingUsers.users.find((user) => user.email === "ryndxtr@gmail.com")
        if (!existingUser) {
          throw new Error("User exists but could not be found")
        }

        authData.user = existingUser
        console.log("[v0] Found existing user:", existingUser.id)
      } else {
        throw new Error(`Failed to create user: ${authError.message}`)
      }
    } else {
      console.log("[v0] User created successfully:", authData.user.id)
    }

    const userId = authData.user.id

    // Step 2: Create or update profile
    console.log("[v0] Creating profile...")
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .upsert(
        {
          user_id: userId,
          business_name: "Reflection Photography",
          avatar: "./assets/avatar.PNG",
          location: "Indonesia",
          favicon: "./assets/favicon.png",
          page_title: "Reflection Photography",
          background_video: {
            webm: "web.webm",
            mp4: "web.mp4",
            ogv: "web.ogv",
            poster: "img/videoframe.jpg",
          },
          theme_preference: "system",
          is_setup: true,
        },
        {
          onConflict: "user_id",
        },
      )
      .select()
      .single()

    if (profileError) {
      throw new Error(`Failed to create profile: ${profileError.message}`)
    }

    console.log("[v0] Profile created successfully:", profileData.id)

    // Step 3: Insert default links
    console.log("[v0] Creating default links...")
    const defaultLinks = [
      {
        profile_id: profileData.id,
        title: "MEMBERSHIP",
        url: "https://drive.google.com/file/d/1pS9eX3F9YlYLh0fvrI4txWdLD_lagDKV/view?pli=1",
        icon: "fa fa-info-circle",
        background_color_light: "#ffd621",
        background_color_dark: "#f59e0b",
        text_color_light: "#333333",
        text_color_dark: "#1f2937",
        opacity: 0.9,
        order_index: 1,
        category: "main",
      },
      {
        profile_id: profileData.id,
        title: "CS Yogyakarta",
        url: "https://wa.me/6285602103418",
        icon: "fab fa-whatsapp",
        background_color_light: "#29c493",
        background_color_dark: "#10b981",
        text_color_light: "#ffffff",
        text_color_dark: "#ffffff",
        opacity: 0.85,
        order_index: 2,
        category: "main",
      },
      {
        profile_id: profileData.id,
        title: "CS Semarang",
        url: "https://wa.me/628112933418",
        icon: "fab fa-whatsapp",
        background_color_light: "#29c493",
        background_color_dark: "#10b981",
        text_color_light: "#ffffff",
        text_color_dark: "#ffffff",
        opacity: 0.85,
        order_index: 3,
        category: "main",
      },
      {
        profile_id: profileData.id,
        title: "CS Solo",
        url: "https://wa.me/628159993418",
        icon: "fab fa-whatsapp",
        background_color_light: "#29c493",
        background_color_dark: "#10b981",
        text_color_light: "#ffffff",
        text_color_dark: "#ffffff",
        opacity: 0.85,
        order_index: 4,
        category: "main",
      },
      {
        profile_id: profileData.id,
        title: "Wedding & Event",
        url: "https://wa.me/6281326008449",
        icon: "fa-solid fa-rings-wedding",
        background_color_light: "#e5e5e5",
        background_color_dark: "#525252",
        text_color_light: "#171717",
        text_color_dark: "#fafafa",
        opacity: 0.8,
        order_index: 5,
        category: "main",
      },
      {
        profile_id: profileData.id,
        title: "Product & Catalog",
        url: "https://www.instagram.com/reflectionphotography_product/",
        icon: "fa-solid fa-box-circle-check",
        background_color_light: "#e5e5e5",
        background_color_dark: "#525252",
        text_color_light: "#171717",
        text_color_dark: "#fafafa",
        opacity: 0.8,
        order_index: 6,
        category: "main",
      },
      {
        profile_id: profileData.id,
        title: "Partnership",
        url: "https://maps.app.goo.gl/RxJB6WmUhxnkziWbA",
        icon: "fa-solid fa-users",
        background_color_light: "#333333",
        background_color_dark: "#404040",
        text_color_light: "#ffffff",
        text_color_dark: "#fafafa",
        opacity: 0.75,
        order_index: 7,
        category: "main",
      },
    ]

    // Insert or upsert each link individually to avoid ON CONFLICT issues
    let createdCount = 0
    for (const link of defaultLinks) {
      const { data: linkData, error: linkError } = await supabase.from("links").upsert(link, {
        onConflict: ["profile_id", "title"],
      })

      if (linkError) {
        // If upsert by columns isn't supported, fallback to insert ignore
        const { error: insertError } = await supabase.from("links").insert(link).select()
        if (insertError) {
          throw new Error(`Failed to create link ${link.title}: ${insertError.message}`)
        }
      }

      createdCount++
    }

    console.log("[v0] Links created successfully:", createdCount)

    // Step 4: Verify setup
    console.log("[v0] Verifying setup...")
    const { data: verifyProfile, error: verifyError } = await supabase
      .from("profiles")
      .select(`
        *,
        links (*)
      `)
      .eq("user_id", userId)
      .single()

    if (verifyError) {
      throw new Error(`Failed to verify setup: ${verifyError.message}`)
    }

    console.log("[v0] Setup verification successful!")
    console.log("[v0] Profile:", verifyProfile.business_name)
    console.log("[v0] Links count:", verifyProfile.links.length)
    console.log("[v0] User ID:", userId)
    console.log("[v0] Profile ID:", verifyProfile.id)

    console.log("\n✅ Complete setup finished successfully!")
    console.log("🔐 Login credentials:")
    console.log("   Email: ryndxtr@gmail.com")
    console.log("   Password: LLLebaran2025#")
    console.log("   Username: ryandxter")
  } catch (error) {
    console.error("❌ Setup failed:", error.message)
    process.exit(1)
  }
}

// Run the setup
setupUserAndData()
