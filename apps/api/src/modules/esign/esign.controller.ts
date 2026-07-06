import {
  Body,
  Controller,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { memoryStorage } from 'multer';
import { AppError } from '../../common/utils/app-error';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';
import { EsignService } from './esign.service';
import { UploadContractDto } from './dto/upload-contract.dto';
import { SignatureRecordDto } from './dto/signature-record.dto';

const MAX_PDF_BYTES = 10 * 1024 * 1024;

@ApiTags('esign')
@ApiExtraModels(ErrorResponseDto)
@Controller()
export class EsignController {
  constructor(private readonly esign: EsignService) {}

  @Post('upload-contract')
  @ApiOperation({
    summary: 'Upload a PDF, create a Setu signature request, and persist the metadata',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'signerName', 'signerIdentifier', 'redirectUrl'],
      properties: {
        file: { type: 'string', format: 'binary', description: 'PDF (≤10MB)' },
        signerName: { type: 'string', example: 'Aarav Sharma' },
        signerIdentifier: { type: 'string', example: 'aarav@example.com' },
        birthYear: { type: 'string', example: '1994' },
        documentName: { type: 'string', example: 'Mutual NDA' },
        redirectUrl: { type: 'string', example: 'http://localhost:3000/signing-complete' },
      },
    },
  })
  @ApiCreatedResponse({ type: SignatureRecordDto })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_PDF_BYTES, files: 1 },
      fileFilter: (_req, file, cb) => {
        if (file.mimetype === 'application/pdf') cb(null, true);
        else cb(new AppError(400, 'INVALID_FILE_TYPE', 'Only PDF files are allowed'), false);
      },
    }),
  )
  uploadContract(
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: true,
        validators: [new MaxFileSizeValidator({ maxSize: MAX_PDF_BYTES })],
      }),
    )
    file: Express.Multer.File,
    @Body() dto: UploadContractDto,
  ): Promise<SignatureRecordDto> {
    return this.esign.uploadContract(dto, file);
  }

  @Get('signature-status/:id')
  @ApiOperation({ summary: 'Fetch the latest status from Setu, persist it, and return the record' })
  @ApiOkResponse({ type: SignatureRecordDto })
  getStatus(@Param('id') id: string): Promise<SignatureRecordDto> {
    return this.esign.refreshStatus(id);
  }

  @Get('download/:id')
  @ApiOperation({ summary: 'Stream the signed PDF back through the backend' })
  @ApiProduces('application/pdf')
  @ApiOkResponse({ description: 'The signed PDF', content: { 'application/pdf': {} } })
  async download(
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { buffer, filename, contentType } = await this.esign.getDownloadStream(id);
    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    return new StreamableFile(buffer);
  }
}
