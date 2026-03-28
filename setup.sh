#!/bin/bash

echo "🎨 Sinipo Art Studio - Setup Script"
echo "=================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v18 or higher."
    echo "   Download from: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version is too old. Please install Node.js v18 or higher."
    echo "   Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"
echo ""

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install frontend dependencies"
    exit 1
fi

echo "✅ Frontend dependencies installed"
echo ""

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install backend dependencies"
    exit 1
fi

echo "✅ Backend dependencies installed"
echo ""

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating environment configuration..."
    cp .env.example .env
    echo "✅ Environment file created"
    echo ""
    echo "⚠️  IMPORTANT: Please edit backend/.env file with your configuration:"
    echo "   PAYSTACK_SECRET_KEY=sk_test_your_secret_key_here"
    echo "   PAYSTACK_PUBLIC_KEY=pk_test_your_public_key_here"
    echo "   ADMIN_SECRET_KEY=your_admin_secret_key_here"
    echo ""
    echo "   Get Paystack keys from: https://paystack.com"
    echo "   Set a secure ADMIN_SECRET_KEY for CMS access"
else
    echo "✅ Environment file already exists"
fi

cd ..

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Edit backend/.env with your Paystack keys"
echo "2. Start the backend: cd backend && npm run dev"
echo "3. Start the frontend: npm run dev"
echo "4. Open http://localhost:5173 in your browser"
echo ""
echo "📚 For detailed instructions, see README.md"
echo ""
echo "🚀 Happy coding!"