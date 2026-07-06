import {
  Body,
  Controller,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Post,
  Query,
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
  // Note: we do NOT reject in multer's fileFilter — doing so aborts the request
  // mid-stream and the client sees a reset instead of a clean 400. Instead multer
  // buffers the file (size-capped) and ParseFilePipe validates type/size after the
  // full body is read, so we always return a well-formed error response.
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_PDF_BYTES, files: 1 },
    }),
  )
  uploadContract(
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: true,
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_PDF_BYTES }),
          new FileTypeValidator({ fileType: 'application/pdf' }),
        ],
        exceptionFactory: (message) => new AppError(400, 'INVALID_FILE', message),
      }),
    )
    file: Express.Multer.File,
    @Body() dto: UploadContractDto,
  ): Promise<SignatureRecordDto> {
    return this.esign.uploadContract(dto, file);
  }

  @Get('signatures')
  @ApiOperation({ summary: 'List recent signature requests (most recent first)' })
  @ApiOkResponse({ type: SignatureRecordDto, isArray: true })
  listRecent(@Query('limit') limit?: string): Promise<SignatureRecordDto[]> {
    const parsed = limit ? Number.parseInt(limit, 10) : 20;
    return this.esign.listRecent(Number.isFinite(parsed) ? parsed : 20);
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
