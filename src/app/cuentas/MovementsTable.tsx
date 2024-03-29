"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { type User } from "lucia";
import { MoreHorizontal } from "lucide-react";
import moment from "moment";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  generateTableData,
  getAllChildrenTags,
  isNumeric,
} from "~/lib/functions";
import { cn } from "~/lib/utils";
import { currencies, dateFormatting } from "~/lib/variables";
import { useCuentasStore } from "~/stores/cuentasStore";
import { api } from "~/trpc/react";
import type { RouterOutputs } from "~/trpc/shared";
import { DateRangePicker } from "../components/DateRangePicker";
import LoadingAnimation from "../components/LoadingAnimation";
import { Icons } from "../components/ui/Icons";
import { Button } from "../components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "../components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Label } from "../components/ui/label";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from "../components/ui/pagination";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { toast } from "../components/ui/use-toast";
import ClientLinkGenerator from "./ClientLinkGenerator";
import { DataTable } from "./DataTable";

interface CuentasTableProps {
  initialMovements: RouterOutputs["movements"]["getCurrentAccounts"];
  tags: RouterOutputs["tags"]["getAll"];
  entities: RouterOutputs["entities"]["getAll"];
  entityId: number | null;
  entityTag: string | null;
  pageSize: number;
  user: User | null;
  accountType: boolean;
  linkId: number | null;
  linkToken: string | null;
}

const MovementsTable = ({
  initialMovements,
  tags,
  entities,
  entityId,
  entityTag,
  pageSize,
  user,
  accountType,
  linkId,
  linkToken,
}: CuentasTableProps) => {
  const utils = api.useContext();

  const searchParams = useSearchParams();
  const selectedEntityString = searchParams.get("entidad");

  const [selectedFromEntity, setSelectedFromEntity] = useState<string>();

  const {
    movementsTablePage,
    setMovementsTablePage,
    destinationEntityId,
    setDestinationEntityId,
    selectedCurrency,
    setSelectedCurrency,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    isInverted,
    timeMachineDate,
  } = useCuentasStore();

  const { data, refetch, isFetching } =
    api.movements.getCurrentAccounts.useQuery(
      {
        linkId: linkId,
        linkToken: linkToken,
        account: accountType,
        entityId: selectedFromEntity ? parseInt(selectedFromEntity) : entityId,
        entityTag: selectedFromEntity ? undefined : entityTag,
        toEntityId: destinationEntityId,
        currency: selectedCurrency,
        fromDate: fromDate,
        toDate: toDate,
        pageNumber: movementsTablePage,
        pageSize: pageSize,
        dayInPast: moment(timeMachineDate).format(dateFormatting.day),
      },
      {
        initialData: initialMovements,
        refetchOnMount: false,
        refetchOnReconnect: false,
        refetchOnWindowFocus: false,
      },
    );

  const { mutateAsync: getUrlAsync, isLoading } =
    api.files.getCurrentAccount.useMutation({
      onSuccess(newOperation) {
        if (newOperation) {
          toast({
            title: "Archivo generado exitosamente",
            description: newOperation.filename,
            variant: "success",
          });
          const link = document.createElement("a");
          link.href = newOperation.downloadUrl;
          link.download = newOperation.filename;
          link.target = "_blank";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      },
      onError(error) {
        toast({
          title: error.data ? error.data.code : "",
          description: error.message,
          variant: "destructive",
        });
      },
    });

  const tableData = generateTableData(
    data.movements,
    entityId,
    entityTag,
    tags,
  );

  const columns: ColumnDef<(typeof tableData)[number]>[] = [
    {
      accessorKey: "id",
      header: "ID",
    },
    {
      accessorKey: "date",
      header: "Fecha",
    },
    {
      accessorKey: "selectedEntity",
      header: "Origen",
    },
    {
      accessorKey: "selectedEntityId",
      header: "Origen ID",
      filterFn: "equals",
    },
    {
      accessorKey: "otherEntity",
      header: "Entidad",
    },
    {
      accessorKey: "otherEntityId",
      header: "Entidad ID",
      filterFn: "equals",
    },
    {
      accessorKey: "type",
      header: "Detalle",
      cell: ({ row }) => {
        let type = "";
        if (row.getValue("type") === "upload") {
          type = "Carga";
        } else if (row.getValue("type") === "confirmation") {
          type = "Confirmación";
        } else if (row.getValue("type") === "cancellation") {
          type = "Cancelación";
        } else {
          type = row.getValue("type");
        }
        const metadata: JSON = row.getValue("metadata");
        const mvId: number = row.getValue("id");
        const txType: string = row.getValue("txType");
        const observations: string = row.getValue("observations");

        return (
          <>
            <p className="font-medium">{`${type} de ${txType} - Mto ${mvId} ${
              // @ts-ignore
              metadata && isNumeric(metadata.exchangeRate)
                ? // @ts-ignore
                `- $${metadata.exchangeRate}`
                : ""
              }`}</p>
            <p className="text-sm font-light text-muted-foreground">
              {observations}
            </p>
          </>
        );
      },
    },
    {
      accessorKey: "txType",
      header: "Transaction type",
    },
    {
      accessorKey: "observations",
      header: "Observaciones",
    },
    {
      accessorKey: "metadata",
      header: "Metadata",
    },
    {
      accessorKey: "currency",
      header: "Divisa",
      filterFn: "equals",
    },
    {
      accessorKey: "ingress",
      header: () => <div className="text-right">Entrada</div>,
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("ingress"));
        const formatted = new Intl.NumberFormat("es-AR").format(amount);
        return amount !== 0 ? (
          <div className="text-right font-medium">
            {" "}
            <span className="font-light text-muted-foreground">
              {tableData[row.index]!.currency.toUpperCase()}
            </span>{" "}
            {formatted}
          </div>
        ) : null;
      },
    },
    {
      accessorKey: "egress",
      header: () => <div className="text-right">Salida</div>,
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("egress"));
        const formatted = new Intl.NumberFormat("es-AR").format(amount);
        return amount !== 0 ? (
          <div className="text-right font-medium">
            {" "}
            <span className="font-light text-muted-foreground">
              {tableData[row.index]!.currency.toUpperCase()}
            </span>{" "}
            {formatted}
          </div>
        ) : null;
      },
    },
    {
      accessorKey: "balance",
      header: () => <div className="text-right">Saldo</div>,
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("balance"));
        const formatted = new Intl.NumberFormat("es-AR").format(amount);
        return (
          <div className="text-right font-medium">
            {" "}
            <span className="font-light text-muted-foreground">
              {tableData[row.index]!.currency.toUpperCase()}
            </span>{" "}
            {formatted}
          </div>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const movement = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
              <DropdownMenuItem>
                <Link
                  href={{
                    pathname: `/operaciones/gestion/${movement.operationId}`,
                    query: { row: row.getValue("id") },
                  }}
                  className="flex flex-row items-center space-x-1"
                >
                  <p>Ver operación</p>
                  <Icons.externalLink className="h-4 text-black" />
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                Ver usuario{" "}
                {/* menu con usuarios que participaron subiendo, confirmando, actualizando */}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const lastPage = Math.ceil(data.totalRows / pageSize);

  return (
    <div>
      <div>
        <div className="flex flex-row flex-wrap items-end justify-start gap-4 py-4">
          {entityTag && (
            <div className="flex flex-col">
              <Label className="mb-2">Origen</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className={cn(
                      "w-[200px] justify-between",
                      !selectedFromEntity && "text-muted-foreground",
                    )}
                  >
                    {selectedFromEntity
                      ? entities.find(
                        (e) => e.id === parseInt(selectedFromEntity),
                      )?.name
                      : "Elegir"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0">
                  <Command>
                    <CommandInput placeholder="Elegir..." />
                    <CommandEmpty>...</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="todas"
                        onSelect={() => setSelectedFromEntity(undefined)}
                      >
                        Todas
                      </CommandItem>
                      {entities
                        .filter(
                          (e) =>
                            getAllChildrenTags(entityTag, tags).includes(
                              e.tag.name,
                            ) || e.id === entityId,
                        )
                        .map((entity) => (
                          <CommandItem
                            key={entity.id}
                            value={entity.name}
                            onSelect={() =>
                              setSelectedFromEntity(entity.id.toString())
                            }
                          >
                            {entity.name}
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}
          <div className="flex flex-col">
            <Label className="mb-1">Divisa</Label>
            <Select
              value={selectedCurrency ?? "todas"}
              onValueChange={(value) =>
                value === "todas"
                  ? setSelectedCurrency(undefined)
                  : setSelectedCurrency(value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Divisa" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem key={"todas"} value="todas">
                    Todas
                  </SelectItem>
                  {currencies.map((currency) => (
                    <SelectItem
                      key={currency?.value}
                      value={currency?.value ? currency.value : ""}
                    >
                      {currency?.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col">
            <Label className="mb-2">Entidad</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className={cn(
                    "w-[200px] justify-between",
                    !destinationEntityId && "text-muted-foreground",
                  )}
                >
                  {destinationEntityId
                    ? entities.find((e) => e.id === destinationEntityId)?.name
                    : "Elegir"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0">
                <Command>
                  <CommandInput placeholder="Elegir..." />
                  <CommandEmpty>...</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="todas"
                      onSelect={() => setDestinationEntityId(undefined)}
                    >
                      Todas
                    </CommandItem>
                    {entities
                      .filter(
                        (e) => e.id !== entityId && e.tag.name !== entityTag,
                      )
                      .map((entity) => (
                        <CommandItem
                          key={entity.id}
                          value={entity.name}
                          onSelect={() => setDestinationEntityId(entity.id)}
                        >
                          {entity.name}
                        </CommandItem>
                      ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex flex-col">
            <Label className="mb-2">Fecha</Label>
            <DateRangePicker
              date={{ from: fromDate, to: toDate }}
              setDate={(d) => {
                setFromDate(d?.from);
                setToDate(d?.to);
              }}
            />
          </div>

          {user && selectedEntityString && !accountType && (
            <ClientLinkGenerator selectedEntityString={selectedEntityString} />
          )}
          <Button
            variant="outline"
            onClick={async () => {
              await utils.movements.getBalancesByEntities.refetch();
              void refetch();
            }}
          >
            <Icons.reload className="h-5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {!isLoading ? (
                <Button variant="outline">Generar</Button>
              ) : (
                <p>Cargando...</p>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuLabel>Extensión</DropdownMenuLabel>
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onClick={async () => {
                    await getUrlAsync({
                      account: accountType,
                      entityId: selectedFromEntity
                        ? parseInt(selectedFromEntity)
                        : entityId,
                      entityTag: selectedFromEntity ? undefined : entityTag,
                      currency: selectedCurrency,
                      fromDate: fromDate,
                      toDate: toDate,
                      fileType: "pdf",
                      tableData,
                    });
                  }}
                >
                  <Icons.pdf className="h-4" />
                  <span>PDF</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={async () => {
                    await getUrlAsync({
                      account: accountType,
                      entityId: selectedFromEntity
                        ? parseInt(selectedFromEntity)
                        : entityId,
                      entityTag: selectedFromEntity ? undefined : entityTag,
                      currency: selectedCurrency,
                      fromDate: fromDate,
                      toDate: toDate,
                      fileType: "csv",
                      tableData,
                    });
                  }}
                >
                  <Icons.excel className="h-4" />
                  <span>Excel</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {!isFetching ? (
          <DataTable
            columns={columns}
            data={tableData.map((row) => {
              if (!isInverted) {
                return row;
              } else {
                return {
                  ...row,
                  selectedEntity: row.otherEntity,
                  selectedEntityId: row.otherEntityId,
                  otherEntity: row.selectedEntity,
                  otherEntityId: row.selectedEntityId,
                  ingress: row.egress,
                  egress: row.ingress,
                  balance: -row.balance,
                };
              }
            })}
          />
        ) : (
          <LoadingAnimation text="Cargando movimientos" />
        )}
      </div>
      <div className="mt-4 flex w-fit flex-col items-center justify-start space-y-2">
        <Pagination>
          <PaginationContent>
            {movementsTablePage > 2 && (
              <PaginationItem>
                <Button
                  onClick={() => setMovementsTablePage(1)}
                  variant="outline"
                  className={cn(
                    movementsTablePage === 1 && "border-muted-foreground",
                  )}
                >
                  1
                </Button>
              </PaginationItem>
            )}
            {movementsTablePage > 3 && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}
            {movementsTablePage > 1 && (
              <PaginationItem>
                <Button
                  variant="outline"
                  onClick={() => setMovementsTablePage(movementsTablePage - 1)}
                >
                  {movementsTablePage - 1}
                </Button>
              </PaginationItem>
            )}
            <PaginationItem>
              <Button
                variant="outline"
                onClick={() => setMovementsTablePage(movementsTablePage)}
                className="border-muted-foreground"
              >
                {movementsTablePage}
              </Button>
            </PaginationItem>
            {movementsTablePage < lastPage && (
              <PaginationItem>
                <Button
                  onClick={() => setMovementsTablePage(movementsTablePage + 1)}
                  variant="outline"
                >
                  {movementsTablePage + 1}
                </Button>
              </PaginationItem>
            )}
            {movementsTablePage < lastPage - 2 && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}
            {movementsTablePage < lastPage - 1 && (
              <PaginationItem>
                <Button
                  onClick={() => setMovementsTablePage(lastPage)}
                  variant="outline"
                >
                  {lastPage}
                </Button>
              </PaginationItem>
            )}
          </PaginationContent>
        </Pagination>
        <p className="text-sm font-light text-muted-foreground">
          {data.totalRows + " " + "movimientos"}
        </p>
      </div>
    </div>
  );
};

export default MovementsTable;
