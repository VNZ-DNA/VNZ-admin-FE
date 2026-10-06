export function normalizeJobPostListResponse<T extends { isSuccess?: boolean; success?: boolean }>(
  response: T,
): Omit<T, 'isSuccess'> & { isSuccess: boolean } {
  return {
    ...response,
    isSuccess: response.isSuccess ?? response.success ?? false,
  }
}
