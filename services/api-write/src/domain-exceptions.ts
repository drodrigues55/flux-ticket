import { HttpException, HttpStatus } from '@nestjs/common';

export class DomainException extends HttpException {
  constructor(
    public readonly code: string,
    message: string,
    status: HttpStatus,
    public readonly details?: unknown
  ) {
    super({ code, message, details }, status);
  }
}

export class InvalidCpfException extends DomainException {
  constructor(details?: unknown) {
    super('INVALID_CPF', 'CPF inválido.', HttpStatus.UNPROCESSABLE_ENTITY, details);
  }
}

export class StockUnavailableException extends DomainException {
  constructor(details?: unknown) {
    super('STOCK_UNAVAILABLE', 'Estoque esgotado ou indisponível para reserva.', HttpStatus.UNPROCESSABLE_ENTITY, details);
  }
}

export class SectorAccessDeniedException extends DomainException {
  constructor(details?: unknown) {
    super('SECTOR_ACCESS_DENIED', 'Dispositivo sem permissão para validar este setor.', HttpStatus.FORBIDDEN, details);
  }
}
