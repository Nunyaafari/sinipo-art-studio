import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";

interface FollowButtonProps {
  targetUserId: number;
  targetUserName: string;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary" | "outline";
}

export default function FollowButton({ 
  targetUserId, 
  targetUserName, 
  size = "md",
  variant = "primary"
}: FollowButtonProps) {
  const { user, isAuthenticated } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem('authToken');
  const API_BASE = 'http://localhost:3001/api/social';

  useEffect(() => {
    if (isAuthenticated && token) {
      checkFollowStatus();
    }
  }, [isAuthenticated, token, targetUserId]);

  const checkFollowStatus = async () => {
    try {
      const response = await fetch(`${API_BASE}/follows`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setIsFollowing(data.data.includes(targetUserId));
      }
    } catch (error) {
      console.error('Failed to check follow status:', error);
    }
  };

  const handleFollow = async () => {
    if (!isAuthenticated) {
      // Could trigger login modal here
      return;
    }

    setLoading(true);

    try {
      const method = isFollowing ? 'DELETE' : 'POST';
      const url = isFollowing 
        ? `${API_BASE}/unfollow/${targetUserId}`
        : `${API_BASE}/follow`;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        ...(method === 'POST' && {
          body: JSON.stringify({ targetUserId })
        })
      });

      const data = await response.json();
      if (data.success) {
        setIsFollowing(!isFollowing);
      }
    } catch (error) {
      console.error('Failed to update follow status:', error);
    } finally {
      setLoading(false);
    }
  };

  // Don't show follow button for own profile
  if (user?.id === targetUserId) {
    return null;
  }

  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base"
  };

  const variantClasses = {
    primary: isFollowing
      ? "bg-gray-200 text-gray-700 hover:bg-red-100 hover:text-red-600"
      : "bg-[#0a0a0a] text-white hover:bg-[#c8a830]",
    secondary: isFollowing
      ? "bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-500"
      : "bg-[#c8a830] text-white hover:bg-[#0a0a0a]",
    outline: isFollowing
      ? "border border-gray-300 text-gray-600 hover:border-red-300 hover:text-red-500"
      : "border border-[#0a0a0a] text-[#0a0a0a] hover:bg-[#0a0a0a] hover:text-white"
  };

  return (
    <button
      onClick={handleFollow}
      disabled={loading}
      className={`${sizeClasses[size]} ${variantClasses[variant]} transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
      style={{ fontFamily: "'Montserrat', sans-serif" }}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {isFollowing ? "UNFOLLOWING..." : "FOLLOWING..."}
        </span>
      ) : (
        <>
          {isFollowing ? (
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              FOLLOWING
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              FOLLOW
            </span>
          )}
        </>
      )}
    </button>
  );
}