/**
 * Pagination Utility
 * Handles consistent pagination across all endpoints
 */

/**
 * Pagination configuration
 */
export const PAGINATION_CONFIG = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 1000,
  MIN_LIMIT: 1,
};

/**
 * Parse pagination parameters from query
 * @param {Object} query - Express query object
 * @returns {Object} { page, limit, skip }
 */
export const parsePaginationQuery = (query) => {
  let page = parseInt(query.page) || PAGINATION_CONFIG.DEFAULT_PAGE;
  let limit = parseInt(query.limit) || PAGINATION_CONFIG.DEFAULT_LIMIT;

  // Validate page
  if (page < 1) page = PAGINATION_CONFIG.DEFAULT_PAGE;

  // Validate limit
  if (limit < PAGINATION_CONFIG.MIN_LIMIT) limit = PAGINATION_CONFIG.MIN_LIMIT;
  if (limit > PAGINATION_CONFIG.MAX_LIMIT) limit = PAGINATION_CONFIG.MAX_LIMIT;

  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

/**
 * Create pagination response object
 * @param {number} total - Total documents count
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @param {Array} data - Data array
 * @param {string} nextUrl - URL for next page (optional)
 * @param {string} prevUrl - URL for previous page (optional)
 * @returns {Object} Pagination response
 */
export const createPaginationResponse = (total, page, limit, data, nextUrl = null, prevUrl = null) => {
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;

  return {
    data,
    pagination: {
      total,
      count: data.length,
      page,
      limit,
      pages: totalPages,
      hasNextPage,
      hasPreviousPage,
      nextPage: hasNextPage ? page + 1 : null,
      previousPage: hasPreviousPage ? page - 1 : null,
      ...(nextUrl && { nextUrl }),
      ...(prevUrl && { prevUrl }),
    },
  };
};

/**
 * Paginate mongoose query
 * @param {Object} query - Mongoose query
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Promise<Object>} Paginated result with metadata
 */
export const paginateQuery = async (query, page, limit) => {
  const skip = (page - 1) * limit;
  const total = await query.model.countDocuments(query.getFilter ? query.getFilter() : {});
  const data = await query.skip(skip).limit(limit);

  return createPaginationResponse(total, page, limit, data);
};

/**
 * Middleware to add pagination helpers to response
 */
export const paginationMiddleware = (req, res, next) => {
  const pagination = parsePaginationQuery(req.query);
  
  // Add pagination helpers to res.locals
  res.locals.pagination = pagination;
  res.locals.parsePagination = parsePaginationQuery;
  res.locals.createPaginationResponse = createPaginationResponse;

  next();
};

/**
 * High-performance pagination for large datasets
 * Uses range-based pagination instead of offset
 * @param {Object} query - Mongoose query
 * @param {any} lastId - Last item ID from previous page
 * @param {number} limit - Items per page
 * @param {string} sortField - Field to sort by
 * @param {number} sortOrder - 1 for ascending, -1 for descending
 * @returns {Promise<Object>} Paginated result
 */
export const cursorPagination = async (query, lastId, limit, sortField = '_id', sortOrder = -1) => {
  if (!limit) limit = PAGINATION_CONFIG.DEFAULT_LIMIT;
  if (limit > PAGINATION_CONFIG.MAX_LIMIT) limit = PAGINATION_CONFIG.MAX_LIMIT;

  // Build cursor filter
  const filter = query.getFilter ? query.getFilter() : {};
  
  if (lastId) {
    if (sortOrder === -1) {
      filter[sortField] = { $lt: lastId };
    } else {
      filter[sortField] = { $gt: lastId };
    }
  }

  // Execute query with limit + 1 to determine if more pages exist
  const results = await query
    .model.find(filter)
    .sort({ [sortField]: sortOrder })
    .limit(limit + 1)
    .lean()
    .exec();

  const hasMore = results.length > limit;
  const data = hasMore ? results.slice(0, limit) : results;
  const nextCursor = hasMore ? data[data.length - 1]?._id : null;

  return {
    data,
    cursor: {
      nextCursor,
      hasMore,
    },
  };
};

/**
 * Aggregation pipeline pagination
 * @param {Array} pipeline - MongoDB aggregation pipeline
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Object} Pagination helper for aggregation
 */
export const aggregationPagination = (page, limit) => {
  const skip = (page - 1) * limit;

  return {
    skip: { $skip: skip },
    limit: { $limit: limit },
  };
};

/**
 * Sort options builder
 * @param {string} sortBy - Field name (supports dot notation)
 * @param {string} order - 'asc' or 'desc'
 * @returns {Object} Sort object for mongoose
 */
export const buildSortOptions = (sortBy = 'createdAt', order = 'desc') => {
  const sortOrder = order === 'asc' ? 1 : -1;
  return { [sortBy]: sortOrder };
};

/**
 * Filter builder with pagination
 * @param {Object} filters - Filter object
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} sortOrder - Sort order
 * @returns {Object} Query builder result
 */
export const buildQueryWithPagination = (filters = {}, page = 1, limit = PAGINATION_CONFIG.DEFAULT_LIMIT, sortBy = 'createdAt', sortOrder = 'desc') => {
  const pagination = {
    page: Math.max(1, parseInt(page)),
    limit: Math.min(parseInt(limit), PAGINATION_CONFIG.MAX_LIMIT),
  };
  
  pagination.skip = (pagination.page - 1) * pagination.limit;

  const sort = buildSortOptions(sortBy, sortOrder);

  return {
    filters,
    pagination,
    sort,
  };
};

export default {
  PAGINATION_CONFIG,
  parsePaginationQuery,
  createPaginationResponse,
  paginateQuery,
  paginationMiddleware,
  cursorPagination,
  aggregationPagination,
  buildSortOptions,
  buildQueryWithPagination,
};
