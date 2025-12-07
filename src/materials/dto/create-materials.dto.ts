export class CreateMaterialDto {
  materialName: string;

  overview: string;

  description?: string;

  author: string;

  pdfUrl: string;

  type: DocumentType;
}
