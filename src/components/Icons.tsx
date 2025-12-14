import { 
  MessageSquare, Users, Kanban, Bot, FolderOpen, Wand2, Settings,
  Send, Plus, X, Check, ChevronLeft, ChevronRight, Search, Bell,
  Upload, Trash2, Edit, Eye, EyeOff, Copy, Link, Mail, Phone,
  Calendar, Clock, Star, AlertCircle, CheckCircle, Info, Loader2,
  Image, Video, FileText, Download, ExternalLink, MoreVertical,
  Sparkles, Zap, Target, TrendingUp, BarChart2, PieChart,
  Instagram, Linkedin, Youtube, Facebook, Hash, AtSign,
  Home, LogOut, User, Building2, Palette, Moon, Sun, 
  ChevronDown, ChevronUp, Filter, SortAsc, Grip, Play, Pause,
  MessageCircle, Archive, Bookmark, Share2, Heart, ThumbsUp,
  RefreshCw, Save, Paperclip, Mic, Camera
} from 'lucide-react';

export const Icons = {
  // Navigation
  Home,
  Chat: MessageSquare,
  Team: Users,
  Board: Kanban,
  Agents: Bot,
  Drive: FolderOpen,
  Wand: Wand2,
  Settings,
  
  // Actions
  Send,
  Plus,
  Close: X,
  Check,
  Edit,
  Delete: Trash2,
  Copy,
  Link,
  Upload,
  Download,
  Save,
  Refresh: RefreshCw,
  
  // Navigation Arrows
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  
  // UI
  Search,
  Bell,
  Eye,
  EyeOff,
  MoreVertical,
  Filter,
  Sort: SortAsc,
  Grip,
  Loader: Loader2,
  
  // Content
  Image,
  Video,
  File: FileText,
  Paperclip,
  Mic,
  Camera,
  
  // Status
  Star,
  Alert: AlertCircle,
  Success: CheckCircle,
  Info,
  
  // AI & Creative
  Sparkles,
  Zap,
  Target,
  Trending: TrendingUp,
  Chart: BarChart2,
  Pie: PieChart,
  
  // Social
  Instagram,
  Linkedin,
  Youtube,
  Facebook,
  Hash,
  AtSign,
  
  // Communication
  Mail,
  Phone,
  MessageCircle,
  
  // Time
  Calendar,
  Clock,
  
  // Organization
  Archive,
  Bookmark,
  Share: Share2,
  External: ExternalLink,
  
  // Engagement
  Heart,
  ThumbsUp,
  Play,
  Pause,
  
  // User
  User,
  Users,
  LogOut,
  Building: Building2,
  
  // Theme
  Palette,
  Moon,
  Sun,
};

export type IconName = keyof typeof Icons;
