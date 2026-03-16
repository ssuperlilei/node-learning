import { IPaginationMeta } from './interface'

export class Pagination<PaginationObject> {
  public readonly items: PaginationObject[]
  public readonly itemCount: number
  public readonly totalItems?: number
  public readonly itemsPerPage: number
  public readonly totalPages?: number
  public readonly currentPage: number

  constructor(items: PaginationObject[], meta: IPaginationMeta) {
    this.items = items
    this.itemCount = meta.itemCount
    this.totalItems = meta.totalItems
    this.itemsPerPage = meta.itemsPerPage
    this.totalPages = meta.totalPages
    this.currentPage = meta.currentPage
  }
}
