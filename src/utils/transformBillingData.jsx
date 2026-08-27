export const transformBillingData = (data) => {
  if (!data) return data;
  const {
    id: _id,
    documentId: _docId,
    createdAt: _created,
    updatedAt: _updated,
    pending: _pending,
    ...rest
  } = data;

  return {
    ...rest,
    customer: data?.customer?.documentId || data?.gst_customer?.id || null,
    size_data: data?.size_data?.map(({ id: _i, ...itemRest }) => itemRest),
    gpay: data?.gpay?.map(({ id: _i, ...itemRest }) => itemRest),
    cash: data?.cash?.map(({ id: _i, ...itemRest }) => itemRest),
    particulars: data?.particulars?.map(({ id: _i, ...itemRest }) => itemRest),
  };
};

