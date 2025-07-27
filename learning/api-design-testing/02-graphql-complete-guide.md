# GraphQL Complete Implementation Guide 🚀

## 🎯 **Overview**

GraphQL is revolutionizing API development by providing a query language that allows clients to request exactly the data they need. This comprehensive guide covers everything from basic schema design to production-ready GraphQL servers with real-time subscriptions.

## 📚 **GraphQL Fundamentals**

### **Why GraphQL vs REST?**

- **Single Endpoint** - One URL for all operations
- **Client-Driven** - Request exactly what you need
- **Strongly Typed** - Schema-first development
- **Real-time** - Built-in subscription support
- **Developer Experience** - Introspection, playground, tooling

### **Core Concepts**

- **Schema** - API contract definition
- **Types** - Object, Scalar, Enum, Interface, Union
- **Queries** - Read operations
- **Mutations** - Write operations
- **Subscriptions** - Real-time updates
- **Resolvers** - Functions that fetch data

---

## 🏗️ **Complete GraphQL Server Implementation**

### **Project Setup - Node.js with Apollo Server**

```bash
# Initialize project
npm init -y
npm install apollo-server-express graphql mongoose bcryptjs jsonwebtoken
npm install -D @types/node typescript ts-node nodemon

# Development dependencies
npm install -D jest @types/jest supertest
```

### **Schema Design - Best Practices**

```graphql
# schema.graphql
scalar DateTime
scalar Upload

# User Management
type User {
  id: ID!
  email: String!
  username: String!
  firstName: String!
  lastName: String!
  avatar: String
  bio: String
  isVerified: Boolean!
  role: UserRole!
  posts: [Post!]!
  followers: [User!]!
  following: [User!]!
  createdAt: DateTime!
  updatedAt: DateTime!
}

enum UserRole {
  USER
  MODERATOR
  ADMIN
}

# Content Management
type Post {
  id: ID!
  title: String!
  content: String!
  excerpt: String
  coverImage: String
  status: PostStatus!
  author: User!
  tags: [Tag!]!
  comments: [Comment!]!
  likes: [Like!]!
  likesCount: Int!
  commentsCount: Int!
  readTime: Int!
  publishedAt: DateTime
  createdAt: DateTime!
  updatedAt: DateTime!
}

enum PostStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

type Comment {
  id: ID!
  content: String!
  author: User!
  post: Post!
  parent: Comment
  replies: [Comment!]!
  likes: [Like!]!
  likesCount: Int!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type Tag {
  id: ID!
  name: String!
  slug: String!
  description: String
  posts: [Post!]!
  postsCount: Int!
  createdAt: DateTime!
}

type Like {
  id: ID!
  user: User!
  post: Post
  comment: Comment
  createdAt: DateTime!
}

# Pagination
type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}

type PostConnection {
  edges: [PostEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type PostEdge {
  node: Post!
  cursor: String!
}

type UserConnection {
  edges: [UserEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type UserEdge {
  node: User!
  cursor: String!
}

# Input Types
input RegisterInput {
  email: String!
  username: String!
  firstName: String!
  lastName: String!
  password: String!
}

input LoginInput {
  email: String!
  password: String!
}

input CreatePostInput {
  title: String!
  content: String!
  excerpt: String
  coverImage: String
  tags: [String!]!
  status: PostStatus = DRAFT
}

input UpdatePostInput {
  title: String
  content: String
  excerpt: String
  coverImage: String
  tags: [String!]
  status: PostStatus
}

input PostsFilter {
  status: PostStatus
  authorId: ID
  tags: [String!]
  search: String
}

# Response Types
type AuthPayload {
  token: String!
  user: User!
  refreshToken: String!
  expiresIn: Int!
}

type MutationResponse {
  success: Boolean!
  message: String!
  data: String
}

# Root Types
type Query {
  # User queries
  me: User
  user(id: ID!): User
  users(first: Int, after: String, last: Int, before: String, filter: String): UserConnection!

  # Post queries
  post(id: ID!): Post
  posts(first: Int, after: String, last: Int, before: String, filter: PostsFilter, sortBy: String, sortOrder: SortOrder): PostConnection!

  # Search
  search(query: String!, type: SearchType): SearchResult!

  # Analytics
  postAnalytics(postId: ID!): PostAnalytics!
}

type Mutation {
  # Authentication
  register(input: RegisterInput!): AuthPayload!
  login(input: LoginInput!): AuthPayload!
  refreshToken(token: String!): AuthPayload!
  logout: MutationResponse!

  # User management
  updateProfile(input: UpdateProfileInput!): User!
  uploadAvatar(file: Upload!): User!
  followUser(userId: ID!): MutationResponse!
  unfollowUser(userId: ID!): MutationResponse!

  # Post management
  createPost(input: CreatePostInput!): Post!
  updatePost(id: ID!, input: UpdatePostInput!): Post!
  deletePost(id: ID!): MutationResponse!
  publishPost(id: ID!): Post!
  likePost(postId: ID!): MutationResponse!
  unlikePost(postId: ID!): MutationResponse!

  # Comment management
  createComment(postId: ID!, content: String!, parentId: ID): Comment!
  updateComment(id: ID!, content: String!): Comment!
  deleteComment(id: ID!): MutationResponse!
  likeComment(commentId: ID!): MutationResponse!

  # Admin operations
  banUser(userId: ID!, reason: String!): MutationResponse!
  deleteUserContent(userId: ID!): MutationResponse!
}

type Subscription {
  # Real-time updates
  postPublished: Post!
  commentAdded(postId: ID!): Comment!
  userOnline: User!
  notificationReceived: Notification!

  # Live data
  postLikesChanged(postId: ID!): PostLikeUpdate!
  typing(postId: ID!): TypingIndicator!
}

# Additional types for subscriptions
type PostLikeUpdate {
  postId: ID!
  likesCount: Int!
  isLiked: Boolean!
}

type TypingIndicator {
  user: User!
  postId: ID!
  isTyping: Boolean!
}

type Notification {
  id: ID!
  type: NotificationType!
  title: String!
  message: String!
  user: User!
  read: Boolean!
  data: String
  createdAt: DateTime!
}

enum NotificationType {
  LIKE
  COMMENT
  FOLLOW
  MENTION
  SYSTEM
}

enum SortOrder {
  ASC
  DESC
}

enum SearchType {
  ALL
  USERS
  POSTS
  TAGS
}

union SearchResult = User | Post | Tag
```

### **Apollo Server Setup with Authentication**

```javascript
const { ApolloServer } = require("apollo-server-express");
const { readFileSync } = require("fs");
const { join } = require("path");
const express = require("express");
const jwt = require("jsonwebtoken");
const { createServer } = require("http");
const { SubscriptionServer } = require("subscriptions-transport-ws");
const { execute, subscribe } = require("graphql");
const { makeExecutableSchema } = require("@graphql-tools/schema");
const { PubSub } = require("graphql-subscriptions");

const resolvers = require("./resolvers");

// Load schema
const typeDefs = readFileSync(join(__dirname, "schema.graphql"), "utf8");

// Create executable schema
const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

// PubSub for subscriptions
const pubsub = new PubSub();

// Authentication middleware
const getUser = async (req) => {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    return user;
  } catch (error) {
    return null;
  }
};

// Create Apollo Server
const server = new ApolloServer({
  schema,
  context: async ({ req, connection }) => {
    // Handle subscriptions (WebSocket)
    if (connection) {
      return {
        ...connection.context,
        pubsub,
      };
    }

    // Handle queries and mutations (HTTP)
    const user = await getUser(req);

    return {
      user,
      pubsub,
      isAuthenticated: !!user,
      req,
    };
  },
  subscriptions: {
    onConnect: async (connectionParams, webSocket) => {
      const token = connectionParams.authorization?.replace("Bearer ", "");

      if (token) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          const user = await User.findById(decoded.userId);

          return {
            user,
            isAuthenticated: !!user,
          };
        } catch (error) {
          throw new Error("Invalid token");
        }
      }

      return {
        user: null,
        isAuthenticated: false,
      };
    },
    onDisconnect: (webSocket, context) => {
      console.log("Client disconnected");
    },
  },
  playground: process.env.NODE_ENV === "development",
  introspection: true,
});

// Express app setup
const app = express();
const httpServer = createServer(app);

// Apply Apollo GraphQL middleware
server.applyMiddleware({ app, path: "/graphql" });

// Start server
const PORT = process.env.PORT || 4000;

httpServer.listen(PORT, () => {
  console.log(`🚀 Server ready at http://localhost:${PORT}${server.graphqlPath}`);
  console.log(`🚀 Subscriptions ready at ws://localhost:${PORT}${server.subscriptionsPath}`);

  // Create subscription server
  new SubscriptionServer(
    {
      execute,
      subscribe,
      schema,
      onConnect: server.subscriptions.onConnect,
      onDisconnect: server.subscriptions.onDisconnect,
    },
    {
      server: httpServer,
      path: server.subscriptionsPath,
    }
  );
});
```

### **Complete Resolver Implementation**

```javascript
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { AuthenticationError, ForbiddenError, UserInputError } = require("apollo-server-express");
const { withFilter } = require("graphql-subscriptions");

const resolvers = {
  Query: {
    // User queries
    me: async (parent, args, context) => {
      if (!context.isAuthenticated) {
        throw new AuthenticationError("You must be logged in");
      }
      return context.user;
    },

    user: async (parent, { id }, context) => {
      const user = await User.findById(id);
      if (!user) {
        throw new UserInputError("User not found");
      }
      return user;
    },

    users: async (parent, { first = 10, after, filter }, context) => {
      const limit = Math.min(first, 100); // Max 100 items
      const query = {};

      // Apply search filter
      if (filter) {
        query.$or = [{ username: { $regex: filter, $options: "i" } }, { firstName: { $regex: filter, $options: "i" } }, { lastName: { $regex: filter, $options: "i" } }];
      }

      // Handle cursor-based pagination
      if (after) {
        query._id = { $gt: after };
      }

      const users = await User.find(query)
        .limit(limit + 1)
        .sort({ _id: 1 });

      const hasNextPage = users.length > limit;
      const edges = users.slice(0, limit).map((user) => ({
        node: user,
        cursor: user._id.toString(),
      }));

      return {
        edges,
        pageInfo: {
          hasNextPage,
          hasPreviousPage: !!after,
          startCursor: edges[0]?.cursor,
          endCursor: edges[edges.length - 1]?.cursor,
        },
        totalCount: await User.countDocuments(query),
      };
    },

    // Post queries
    post: async (parent, { id }) => {
      const post = await Post.findById(id).populate("author tags");
      if (!post) {
        throw new UserInputError("Post not found");
      }
      return post;
    },

    posts: async (parent, { first = 10, after, filter, sortBy = "createdAt", sortOrder = "DESC" }) => {
      const limit = Math.min(first, 100);
      const query = {};

      // Apply filters
      if (filter) {
        if (filter.status) query.status = filter.status;
        if (filter.authorId) query.author = filter.authorId;
        if (filter.tags?.length) query.tags = { $in: filter.tags };
        if (filter.search) {
          query.$or = [{ title: { $regex: filter.search, $options: "i" } }, { content: { $regex: filter.search, $options: "i" } }];
        }
      }

      // Handle pagination
      if (after) {
        query._id = { $gt: after };
      }

      // Sort configuration
      const sortConfig = {};
      sortConfig[sortBy] = sortOrder === "DESC" ? -1 : 1;

      const posts = await Post.find(query)
        .populate("author tags")
        .limit(limit + 1)
        .sort(sortConfig);

      const hasNextPage = posts.length > limit;
      const edges = posts.slice(0, limit).map((post) => ({
        node: post,
        cursor: post._id.toString(),
      }));

      return {
        edges,
        pageInfo: {
          hasNextPage,
          hasPreviousPage: !!after,
          startCursor: edges[0]?.cursor,
          endCursor: edges[edges.length - 1]?.cursor,
        },
        totalCount: await Post.countDocuments(query),
      };
    },
  },

  Mutation: {
    // Authentication
    register: async (parent, { input }) => {
      // Validate input
      const existingUser = await User.findOne({
        $or: [{ email: input.email }, { username: input.username }],
      });

      if (existingUser) {
        throw new UserInputError("User with this email or username already exists");
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(input.password, 12);

      // Create user
      const user = new User({
        ...input,
        password: hashedPassword,
        isVerified: false,
        role: "USER",
      });

      await user.save();

      // Generate tokens
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });

      const refreshToken = jwt.sign({ userId: user._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: "7d" });

      return {
        token,
        refreshToken,
        user,
        expiresIn: 3600,
      };
    },

    login: async (parent, { input }) => {
      const user = await User.findOne({ email: input.email });
      if (!user) {
        throw new UserInputError("Invalid credentials");
      }

      const isValidPassword = await bcrypt.compare(input.password, user.password);
      if (!isValidPassword) {
        throw new UserInputError("Invalid credentials");
      }

      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });

      const refreshToken = jwt.sign({ userId: user._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: "7d" });

      return {
        token,
        refreshToken,
        user,
        expiresIn: 3600,
      };
    },

    // Post management
    createPost: async (parent, { input }, context) => {
      if (!context.isAuthenticated) {
        throw new AuthenticationError("You must be logged in");
      }

      const post = new Post({
        ...input,
        author: context.user._id,
      });

      await post.save();
      await post.populate("author tags");

      // Publish to subscribers if published
      if (input.status === "PUBLISHED") {
        context.pubsub.publish("POST_PUBLISHED", {
          postPublished: post,
        });
      }

      return post;
    },

    updatePost: async (parent, { id, input }, context) => {
      if (!context.isAuthenticated) {
        throw new AuthenticationError("You must be logged in");
      }

      const post = await Post.findById(id);
      if (!post) {
        throw new UserInputError("Post not found");
      }

      // Check ownership
      if (post.author.toString() !== context.user._id.toString()) {
        throw new ForbiddenError("You can only edit your own posts");
      }

      Object.assign(post, input);
      await post.save();
      await post.populate("author tags");

      return post;
    },

    likePost: async (parent, { postId }, context) => {
      if (!context.isAuthenticated) {
        throw new AuthenticationError("You must be logged in");
      }

      const post = await Post.findById(postId);
      if (!post) {
        throw new UserInputError("Post not found");
      }

      // Check if already liked
      const existingLike = await Like.findOne({
        user: context.user._id,
        post: postId,
      });

      if (existingLike) {
        throw new UserInputError("You have already liked this post");
      }

      // Create like
      const like = new Like({
        user: context.user._id,
        post: postId,
      });

      await like.save();

      // Update post likes count
      const likesCount = await Like.countDocuments({ post: postId });

      // Publish real-time update
      context.pubsub.publish("POST_LIKES_CHANGED", {
        postLikesChanged: {
          postId,
          likesCount,
          isLiked: true,
        },
      });

      return {
        success: true,
        message: "Post liked successfully",
      };
    },
  },

  Subscription: {
    postPublished: {
      subscribe: (parent, args, context) => {
        return context.pubsub.asyncIterator(["POST_PUBLISHED"]);
      },
    },

    commentAdded: {
      subscribe: withFilter(
        (parent, args, context) => {
          return context.pubsub.asyncIterator(["COMMENT_ADDED"]);
        },
        (payload, variables) => {
          return payload.commentAdded.post.toString() === variables.postId;
        }
      ),
    },

    postLikesChanged: {
      subscribe: withFilter(
        (parent, args, context) => {
          return context.pubsub.asyncIterator(["POST_LIKES_CHANGED"]);
        },
        (payload, variables) => {
          return payload.postLikesChanged.postId === variables.postId;
        }
      ),
    },
  },

  // Field resolvers
  User: {
    posts: async (user) => {
      return await Post.find({ author: user._id }).populate("author tags");
    },

    followers: async (user) => {
      const follows = await Follow.find({ following: user._id }).populate("follower");
      return follows.map((follow) => follow.follower);
    },

    following: async (user) => {
      const follows = await Follow.find({ follower: user._id }).populate("following");
      return follows.map((follow) => follow.following);
    },
  },

  Post: {
    comments: async (post) => {
      return await Comment.find({ post: post._id }).populate("author");
    },

    likes: async (post) => {
      return await Like.find({ post: post._id }).populate("user");
    },

    likesCount: async (post) => {
      return await Like.countDocuments({ post: post._id });
    },

    commentsCount: async (post) => {
      return await Comment.countDocuments({ post: post._id });
    },

    readTime: (post) => {
      // Calculate reading time (average 200 words per minute)
      const wordsCount = post.content.split(" ").length;
      return Math.ceil(wordsCount / 200);
    },
  },

  Comment: {
    replies: async (comment) => {
      return await Comment.find({ parent: comment._id }).populate("author");
    },

    likesCount: async (comment) => {
      return await Like.countDocuments({ comment: comment._id });
    },
  },

  // Custom scalars
  DateTime: {
    serialize: (date) => date.toISOString(),
    parseValue: (value) => new Date(value),
    parseLiteral: (ast) => new Date(ast.value),
  },
};

module.exports = resolvers;
```

### **Frontend Integration - React Apollo Client**

```javascript
// Apollo Client setup
import { ApolloClient, InMemoryCache, createHttpLink, split } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { getMainDefinition } from "@apollo/client/utilities";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { createClient } from "graphql-ws";

// HTTP link for queries and mutations
const httpLink = createHttpLink({
  uri: "http://localhost:4000/graphql",
});

// WebSocket link for subscriptions
const wsLink = new GraphQLWsLink(
  createClient({
    url: "ws://localhost:4000/graphql",
    connectionParams: () => ({
      authorization: localStorage.getItem("token") ? `Bearer ${localStorage.getItem("token")}` : "",
    }),
  })
);

// Auth link to add token to requests
const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem("token");

  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
    },
  };
});

// Split link to route to correct transport
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return definition.kind === "OperationDefinition" && definition.operation === "subscription";
  },
  wsLink,
  authLink.concat(httpLink)
);

// Apollo Client instance
const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          posts: {
            keyArgs: ["filter"],
            merge(existing = { edges: [] }, incoming) {
              return {
                ...incoming,
                edges: [...existing.edges, ...incoming.edges],
              };
            },
          },
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      errorPolicy: "all",
    },
  },
});

export default client;
```

### **React Components with GraphQL**

```javascript
// Queries and mutations
import { gql, useQuery, useMutation, useSubscription } from "@apollo/client";

const GET_POSTS = gql`
  query GetPosts($first: Int, $after: String, $filter: PostsFilter) {
    posts(first: $first, after: $after, filter: $filter) {
      edges {
        node {
          id
          title
          excerpt
          coverImage
          status
          author {
            id
            username
            avatar
          }
          likesCount
          commentsCount
          readTime
          createdAt
        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
      totalCount
    }
  }
`;

const CREATE_POST = gql`
  mutation CreatePost($input: CreatePostInput!) {
    createPost(input: $input) {
      id
      title
      content
      status
      author {
        id
        username
      }
      createdAt
    }
  }
`;

const LIKE_POST = gql`
  mutation LikePost($postId: ID!) {
    likePost(postId: $postId) {
      success
      message
    }
  }
`;

const POST_LIKES_SUBSCRIPTION = gql`
  subscription PostLikesChanged($postId: ID!) {
    postLikesChanged(postId: $postId) {
      postId
      likesCount
      isLiked
    }
  }
`;

// Posts List Component
const PostsList = () => {
  const { data, loading, error, fetchMore } = useQuery(GET_POSTS, {
    variables: { first: 10 },
    notifyOnNetworkStatusChange: true,
  });

  const [likePost] = useMutation(LIKE_POST, {
    update(cache, { data: { likePost } }) {
      if (likePost.success) {
        // Update cache optimistically
        cache.modify({
          fields: {
            posts(existing) {
              // Update likes count in existing data
              return existing;
            },
          },
        });
      }
    },
  });

  const handleLoadMore = () => {
    fetchMore({
      variables: {
        after: data.posts.pageInfo.endCursor,
      },
    });
  };

  const handleLike = async (postId) => {
    try {
      await likePost({ variables: { postId } });
    } catch (error) {
      console.error("Error liking post:", error);
    }
  };

  if (loading && !data) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="posts-list">
      {data?.posts.edges.map(({ node: post }) => (
        <PostCard key={post.id} post={post} onLike={() => handleLike(post.id)} />
      ))}

      {data?.posts.pageInfo.hasNextPage && (
        <button onClick={handleLoadMore} disabled={loading}>
          {loading ? "Loading..." : "Load More"}
        </button>
      )}
    </div>
  );
};

// Post Card with Real-time Likes
const PostCard = ({ post, onLike }) => {
  const [likesCount, setLikesCount] = useState(post.likesCount);

  // Subscribe to real-time likes updates
  useSubscription(POST_LIKES_SUBSCRIPTION, {
    variables: { postId: post.id },
    onData: ({ data }) => {
      if (data?.data?.postLikesChanged) {
        setLikesCount(data.data.postLikesChanged.likesCount);
      }
    },
  });

  return (
    <div className="post-card">
      <h3>{post.title}</h3>
      <p>{post.excerpt}</p>

      <div className="post-meta">
        <span>By {post.author.username}</span>
        <span>{post.readTime} min read</span>
      </div>

      <div className="post-actions">
        <button onClick={onLike}>❤️ {likesCount}</button>
        <span>💬 {post.commentsCount}</span>
      </div>
    </div>
  );
};

// Create Post Form
const CreatePostForm = () => {
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    excerpt: "",
    tags: [],
    status: "DRAFT",
  });

  const [createPost, { loading, error }] = useMutation(CREATE_POST, {
    update(cache, { data: { createPost } }) {
      // Add new post to cache
      cache.modify({
        fields: {
          posts(existing = { edges: [] }) {
            const newEdge = {
              node: createPost,
              cursor: createPost.id,
            };

            return {
              ...existing,
              edges: [newEdge, ...existing.edges],
            };
          },
        },
      });
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await createPost({
        variables: {
          input: formData,
        },
      });

      // Reset form
      setFormData({
        title: "",
        content: "",
        excerpt: "",
        tags: [],
        status: "DRAFT",
      });
    } catch (error) {
      console.error("Error creating post:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="create-post-form">
      <input type="text" placeholder="Post title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />

      <textarea placeholder="Post content" value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} required />

      <input type="text" placeholder="Excerpt" value={formData.excerpt} onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })} />

      <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
        <option value="DRAFT">Draft</option>
        <option value="PUBLISHED">Published</option>
      </select>

      <button type="submit" disabled={loading}>
        {loading ? "Creating..." : "Create Post"}
      </button>

      {error && <div className="error">{error.message}</div>}
    </form>
  );
};
```

---

## 🔒 **GraphQL Security Best Practices**

### **Query Complexity Analysis**

```javascript
const costAnalysis = require("graphql-cost-analysis");

const server = new ApolloServer({
  typeDefs,
  resolvers,
  validationRules: [
    costAnalysis({
      maximumCost: 1000,
      defaultCost: 1,
      scalarCost: 1,
      objectCost: 2,
      listFactor: 10,
      introspectionCost: 1000,
      createError: (max, actual) => {
        return new Error(`Query cost ${actual} exceeds maximum cost ${max}`);
      },
    }),
  ],
});
```

### **Query Depth Limiting**

```javascript
const depthLimit = require("graphql-depth-limit");

const server = new ApolloServer({
  typeDefs,
  resolvers,
  validationRules: [depthLimit(7)],
});
```

### **Rate Limiting**

```javascript
const { shield, rule, and, or, not } = require("graphql-shield");
const { RateLimiterRedis } = require("rate-limiter-flexible");

const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "middleware",
  points: 100, // requests
  duration: 60, // per 60 seconds
});

const rateLimit = rule({ cache: "contextual" })(async (parent, args, context, info) => {
  try {
    await rateLimiter.consume(context.req.ip);
    return true;
  } catch (rejRes) {
    throw new Error("Rate limit exceeded");
  }
});

const permissions = shield({
  Query: {
    users: rateLimit,
    posts: rateLimit,
  },
  Mutation: {
    createPost: and(isAuthenticated, rateLimit),
    updatePost: and(isAuthenticated, isOwner, rateLimit),
  },
});
```

---

## 📊 **Performance Optimization**

### **DataLoader for N+1 Problem**

```javascript
const DataLoader = require("dataloader");

// Create data loaders
const createLoaders = () => ({
  userLoader: new DataLoader(async (userIds) => {
    const users = await User.find({ _id: { $in: userIds } });
    return userIds.map((id) => users.find((user) => user._id.toString() === id));
  }),

  postsByUserLoader: new DataLoader(async (userIds) => {
    const posts = await Post.find({ author: { $in: userIds } });
    return userIds.map((userId) => posts.filter((post) => post.author.toString() === userId));
  }),

  commentsLoader: new DataLoader(async (postIds) => {
    const comments = await Comment.find({ post: { $in: postIds } });
    return postIds.map((postId) => comments.filter((comment) => comment.post.toString() === postId));
  }),
});

// Use in context
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => ({
    ...createLoaders(),
    user: getUser(req),
  }),
});

// Update resolvers to use DataLoader
const resolvers = {
  User: {
    posts: (user, args, { postsByUserLoader }) => {
      return postsByUserLoader.load(user._id);
    },
  },

  Post: {
    author: (post, args, { userLoader }) => {
      return userLoader.load(post.author);
    },

    comments: (post, args, { commentsLoader }) => {
      return commentsLoader.load(post._id);
    },
  },
};
```

### **Query Caching**

```javascript
const { RedisCache } = require("apollo-server-cache-redis");

const server = new ApolloServer({
  typeDefs,
  resolvers,
  cache: new RedisCache({
    host: "redis-server",
    // Options are passed through to the Redis constructor
  }),
  cacheControl: {
    defaultMaxAge: 300, // 5 minutes
  },
});

// Add cache hints to resolvers
const resolvers = {
  Query: {
    posts: async (parent, args, context, info) => {
      // Cache for 5 minutes
      info.cacheControl.setCacheHint({ maxAge: 300 });

      return await Post.find().populate("author");
    },
  },
};
```

---

## 🧪 **Testing GraphQL APIs**

### **Integration Tests**

```javascript
const { createTestClient } = require("apollo-server-testing");
const { gql } = require("apollo-server-express");

describe("GraphQL API", () => {
  let server, query, mutate;

  beforeAll(async () => {
    server = new ApolloServer({
      typeDefs,
      resolvers,
      context: () => ({
        user: mockUser,
        isAuthenticated: true,
      }),
    });

    const testClient = createTestClient(server);
    query = testClient.query;
    mutate = testClient.mutate;
  });

  describe("Posts", () => {
    it("should fetch posts", async () => {
      const GET_POSTS = gql`
        query GetPosts {
          posts(first: 5) {
            edges {
              node {
                id
                title
                author {
                  username
                }
              }
            }
            totalCount
          }
        }
      `;

      const response = await query({ query: GET_POSTS });

      expect(response.errors).toBeUndefined();
      expect(response.data.posts).toBeDefined();
      expect(response.data.posts.edges).toHaveLength(5);
    });

    it("should create a post", async () => {
      const CREATE_POST = gql`
        mutation CreatePost($input: CreatePostInput!) {
          createPost(input: $input) {
            id
            title
            content
            status
          }
        }
      `;

      const variables = {
        input: {
          title: "Test Post",
          content: "This is a test post",
          status: "PUBLISHED",
          tags: ["test"],
        },
      };

      const response = await mutate({
        mutation: CREATE_POST,
        variables,
      });

      expect(response.errors).toBeUndefined();
      expect(response.data.createPost).toMatchObject({
        title: "Test Post",
        content: "This is a test post",
        status: "PUBLISHED",
      });
    });
  });
});
```

---

## 🎯 **Best Practices Summary**

### **✅ GraphQL Production Checklist**

#### **Schema Design**

- ✅ **Strong typing** - Use proper GraphQL types
- ✅ **Pagination** - Implement cursor-based pagination
- ✅ **Error handling** - Proper error types and messages
- ✅ **Versioning strategy** - Schema evolution practices
- ✅ **Documentation** - Comprehensive field descriptions

#### **Security**

- ✅ **Authentication** - JWT-based auth system
- ✅ **Authorization** - Field-level permissions
- ✅ **Query limits** - Depth and complexity analysis
- ✅ **Rate limiting** - Per-user request limits
- ✅ **Input validation** - Sanitize all inputs

#### **Performance**

- ✅ **DataLoader** - Solve N+1 query problem
- ✅ **Caching** - Query and response caching
- ✅ **Database optimization** - Efficient queries
- ✅ **Real-time** - WebSocket subscriptions
- ✅ **Monitoring** - Query performance tracking

---

## 🚀 **Next Steps**

1. **Set up development environment** with Apollo Server
2. **Design your schema** following best practices
3. **Implement resolvers** with proper error handling
4. **Add authentication** and authorization
5. **Integrate with frontend** using Apollo Client
6. **Add real-time features** with subscriptions
7. **Optimize performance** with DataLoader and caching

_GraphQL provides a powerful, flexible API layer that scales with your application. Master these patterns to build modern, efficient APIs!_
